import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { rateLimiters } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'
import { E164_SOMALILAND_PATTERN } from '@/lib/validators'

const bodySchema = z.object({
  orderId: z.string().uuid(),
  refundMethod: z.enum(['original_payment', 'cash', 'store_credit']),
  mobileMoneyPhone: z.string().regex(E164_SOMALILAND_PATTERN).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        productId: z.string().uuid().nullable(),
        variantId: z.string().uuid().nullable(),
        quantity: z.number().int().positive(),
        reason: z.enum(['wrong_item', 'defective', 'not_as_described', 'changed_mind', 'other']),
        photoUrls: z.array(z.string().url()).max(3).optional(),
      })
    )
    .min(1),
})

const REASON_LABELS: Record<string, string> = {
  wrong_item: 'Wrong item delivered',
  defective: 'Defective',
  not_as_described: 'Product not as described',
  changed_mind: 'Changed my mind',
  other: 'Other',
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimiters.returnCreate.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid return request' }, { status: 400 })
  }
  const { orderId, refundMethod, mobileMoneyPhone, items } = parsed.data

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, location_id, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: orderItems } = await supabase.from('order_items').select('id, quantity').eq('order_id', orderId)
  const orderItemIds = new Set((orderItems ?? []).map((i) => i.id))
  if (!items.every((i) => orderItemIds.has(i.orderItemId))) {
    return NextResponse.json({ error: 'One or more items do not belong to this order' }, { status: 400 })
  }

  const { data: returnRow, error: returnError } = await supabase
    .from('returns')
    .insert({
      customer_id: user.id,
      order_id: orderId,
      location_id: order.location_id,
      refund_method: refundMethod,
      mobile_money_phone: mobileMoneyPhone ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (returnError || !returnRow) {
    return NextResponse.json({ error: 'Could not submit return request' }, { status: 500 })
  }

  const { error: itemsError } = await supabase.from('return_items').insert(
    items.map((item) => ({
      return_id: returnRow.id,
      order_item_id: item.orderItemId,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      reason: REASON_LABELS[item.reason],
      photo_urls: item.photoUrls ?? [],
    }))
  )

  if (itemsError) {
    return NextResponse.json({ error: 'Could not submit return items' }, { status: 500 })
  }

  return NextResponse.json({ returnId: returnRow.id })
}
