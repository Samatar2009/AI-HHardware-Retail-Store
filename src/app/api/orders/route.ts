import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimiters } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'
import { E164_SOMALILAND_PATTERN } from '@/lib/validators'

const bodySchema = z.object({
  locationId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid(),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1),
  paymentMethod: z.enum(['zaad', 'edahab', 'evc_plus', 'sahal', 'cash_on_pickup']),
  mobileMoneyPhone: z.string().regex(E164_SOMALILAND_PATTERN).optional(),
  discountCode: z.string().max(50).optional(),
  redeemLoyalty: z.boolean().optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimiters.orderCreate.limit(ip)
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
    return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
  }
  const { locationId, items, paymentMethod, mobileMoneyPhone, discountCode, redeemLoyalty, notes } = parsed.data

  const combinedNotes = [
    notes,
    mobileMoneyPhone ? `Sent from: ${mobileMoneyPhone}` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  const admin = createAdminClient()

  const { data, error } = await admin.rpc('create_order', {
    p_customer_id: user.id,
    p_location_id: locationId,
    p_items: items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.quantity })),
    p_payment_method: paymentMethod,
    p_discount_code: discountCode ?? undefined,
    p_redeem_loyalty: redeemLoyalty ?? false,
    p_notes: combinedNotes || undefined,
  })

  if (error || !data || data.length === 0) {
    const message = error?.message ?? 'Could not place your order. Please try again.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const order = data[0]
  return NextResponse.json({
    orderId: order.order_id,
    orderNumber: order.order_number,
    pickupCode: order.pickup_code,
    totalSlsh: order.total_slsh,
  })
}
