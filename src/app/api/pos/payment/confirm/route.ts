import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'
import { sendSms } from '@/lib/sms'

const bodySchema = z.object({
  orderId: z.string().uuid(),
  transactionReference: z.string().min(1).max(100),
})

export async function POST(request: Request) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, status, total_slsh, payment_method, customer:profiles!orders_customer_id_fkey(phone)'
    )
    .eq('id', parsed.data.orderId)
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

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'payment_confirmed', payment_status: 'confirmed' })
    .eq('id', parsed.data.orderId)

  if (updateError) {
    return NextResponse.json({ error: 'Could not confirm payment' }, { status: 500 })
  }

  await supabase.from('payment_transactions').insert({
    order_id: parsed.data.orderId,
    payment_method: order.payment_method,
    amount_slsh: order.total_slsh,
    status: 'confirmed',
    transaction_reference: parsed.data.transactionReference,
    confirmed_by: userId,
    confirmed_at: new Date().toISOString(),
  })

  const customerPhone = (order.customer as unknown as { phone: string } | null)?.phone
  if (customerPhone) {
    await sendSms(
      customerPhone,
      `Borama Hardware: Your payment has been confirmed. We're preparing your order for pickup.`,
      'payment_confirmed'
    ).catch(() => undefined)
  }

  return NextResponse.json({ success: true })
}
