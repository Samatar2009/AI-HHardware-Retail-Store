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
    .select('id, customer_id, location_id, status, updated_at')
    .eq('id', orderId)
    .single()

  if (orderError || !order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // App Flow doc 3.8: returns are only accepted for completed orders, within
  // 7 days of completion.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const withinReturnWindow = order.updated_at && Date.now() - new Date(order.updated_at).getTime() < SEVEN_DAYS_MS
  if (order.status !== 'completed' || !withinReturnWindow) {
    return NextResponse.json({ error: 'This order is not eligible for a return' }, { status: 400 })
  }

  const { data: orderItems } = await supabase.from('order_items').select('id, quantity').eq('order_id', orderId)
  const purchasedQtyById = new Map((orderItems ?? []).map((i) => [i.id, i.quantity]))

  // Sum quantity already requested against each order_item across every
  // non-rejected return already filed for this order, so a customer can't
  // submit the same item across multiple requests to be refunded more than
  // once for what they actually bought.
  const { data: existingReturns } = await supabase.from('returns').select('id').eq('order_id', orderId).neq('status', 'rejected')
  const existingReturnIds = (existingReturns ?? []).map((r) => r.id)

  const alreadyRequestedQtyById = new Map<string, number>()
  if (existingReturnIds.length > 0) {
    const { data: existingItems } = await supabase
      .from('return_items')
      .select('order_item_id, quantity')
      .in('return_id', existingReturnIds)
    for (const item of existingItems ?? []) {
      if (!item.order_item_id) continue
      alreadyRequestedQtyById.set(item.order_item_id, (alreadyRequestedQtyById.get(item.order_item_id) ?? 0) + item.quantity)
    }
  }

  for (const item of items) {
    const purchasedQty = purchasedQtyById.get(item.orderItemId)
    if (purchasedQty === undefined) {
      return NextResponse.json({ error: 'One or more items do not belong to this order' }, { status: 400 })
    }
    const alreadyRequested = alreadyRequestedQtyById.get(item.orderItemId) ?? 0
    if (alreadyRequested + item.quantity > purchasedQty) {
      return NextResponse.json(
        { error: 'Requested return quantity exceeds what was purchased (or was already requested)' },
        { status: 400 }
      )
    }
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
