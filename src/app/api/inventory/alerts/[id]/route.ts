import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not resolve alert' }, { status: 500 })
  }

  return NextResponse.json({ alert: data })
}
