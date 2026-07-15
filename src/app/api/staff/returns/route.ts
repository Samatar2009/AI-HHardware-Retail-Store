import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const {
    userId,
    role,
    error: authError,
  } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()

  let locationId: string | null
  if (role === 'admin') {
    const { data } = await supabase
      .from('locations')
      .select('id')
      .eq('is_active', true)
      .order('name_en')
      .limit(1)
      .single()
    locationId = data?.id ?? null
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('location_id')
      .eq('user_id', userId)
      .single()
    locationId = data?.location_id ?? null
  }

  if (!locationId) {
    return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
  }

  const { data: returns, error } = await supabase
    .from('returns')
    .select(
      '*, customer:profiles!returns_customer_id_fkey(phone, full_name), order:orders(order_number), return_items(*)'
    )
    .eq('location_id', locationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Could not load returns' }, { status: 500 })
  }

  return NextResponse.json({ returns })
}
