import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'cashier', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, customer:profiles!orders_customer_id_fkey(phone, full_name), location:locations(name_en, address), order_items(*), payment_transactions(*)'
    )
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ order: data })
}
