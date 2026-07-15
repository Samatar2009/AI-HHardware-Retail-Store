import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'cashier', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.status !== 'ready_for_pickup') {
    return NextResponse.json(
      { error: 'Order must be ready_for_pickup before it can be completed' },
      { status: 409 }
    )
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', params.id)

  if (updateError) {
    return NextResponse.json({ error: 'Could not complete order' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
