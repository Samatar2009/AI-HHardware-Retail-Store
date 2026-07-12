import { randomInt } from 'crypto'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'
import { sendSms } from '@/lib/sms'

// Pickup codes gate physical order handover, so this must be a CSPRNG, not
// Math.random() — a guessable code would let someone else claim an order.
function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join('')
}

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'cashier', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, pickup_code, customer:profiles!orders_customer_id_fkey(phone)')
    .eq('id', params.id)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.status !== 'payment_confirmed') {
    return NextResponse.json({ error: 'Order must be payment_confirmed before it can be marked ready' }, { status: 409 })
  }

  const pickupCode = order.pickup_code ?? generatePickupCode()

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'ready_for_pickup', pickup_code: pickupCode })
    .eq('id', params.id)

  if (updateError) {
    return NextResponse.json({ error: 'Could not update order' }, { status: 500 })
  }

  const customerPhone = (order.customer as unknown as { phone: string } | null)?.phone
  if (customerPhone) {
    await sendSms(
      customerPhone,
      `Borama Hardware: Your order is ready for pickup! Your pickup code is ${pickupCode}.`,
      'ready_for_pickup'
    ).catch(() => undefined)
  }

  return NextResponse.json({ success: true, pickupCode })
}
