import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { userId, role, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()

  // RLS (parked_transactions_update_own) already restricts this to the
  // owning cashier, but check explicitly first so a mismatch returns a
  // clear 403/404 instead of an opaque 500, and so the intent survives any
  // future refactor away from the RLS-scoped client.
  const { data: parked } = await supabase.from('parked_transactions').select('cashier_id').eq('id', params.id).single()
  if (!parked) {
    return NextResponse.json({ error: 'Parked cart not found' }, { status: 404 })
  }
  if (parked.cashier_id !== userId && role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized to recall this cart' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('parked_transactions')
    .update({ is_recalled: true })
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not recall cart' }, { status: 500 })
  }

  return NextResponse.json({ parked: data })
}
