import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const bodySchema = z.object({ note: z.string().min(3).max(500) })

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'cashier', 'inventory_manager'])
  if (authError) return authError

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'A note is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, notes')
    .eq('id', params.id)
    .single()
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.status !== 'payment_submitted' && order.status !== 'pending_payment') {
    return NextResponse.json(
      { error: 'Order is not awaiting payment confirmation' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      notes: order.notes ? `${order.notes}\n${parsed.data.note}` : parsed.data.note,
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Could not report issue' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
