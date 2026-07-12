import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/require-role'

const receiveSchema = z.object({
  locationId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
        costPriceSlsh: z.number().int().nonnegative(),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1),
})

const DEFAULT_THRESHOLD = 5

export async function POST(request: Request) {
  const { userId, role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = receiveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid receive data', details: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  let locationId = body.locationId ?? null

  if (role === 'inventory_manager') {
    const { data: profile } = await supabase.from('profiles').select('location_id').eq('user_id', userId).single()
    if (!profile?.location_id) {
      return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
    }
    locationId = profile.location_id
  }
  if (!locationId) {
    return NextResponse.json({ error: 'A location must be specified' }, { status: 400 })
  }

  const admin = createAdminClient()
  const results: { productId: string; variantId: string; newQuantity: number }[] = []

  for (const item of body.items) {
    const { data: existing } = await admin
      .from('inventory')
      .select('id, quantity_on_hand')
      .eq('product_id', item.productId)
      .eq('variant_id', item.variantId)
      .eq('location_id', locationId)
      .maybeSingle()

    let newQuantity: number

    if (existing) {
      newQuantity = existing.quantity_on_hand + item.quantity
      const { error: updateError } = await admin
        .from('inventory')
        .update({ quantity_on_hand: newQuantity, last_restocked_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) {
        return NextResponse.json({ error: 'Could not update inventory' }, { status: 500 })
      }
    } else {
      newQuantity = item.quantity
      const { error: insertError } = await admin.from('inventory').insert({
        product_id: item.productId,
        variant_id: item.variantId,
        location_id: locationId,
        quantity_on_hand: newQuantity,
        quantity_reserved: 0,
        threshold: DEFAULT_THRESHOLD,
        last_restocked_at: new Date().toISOString(),
      })

      if (insertError) {
        return NextResponse.json({ error: 'Could not create inventory record' }, { status: 500 })
      }
    }

    await admin.from('product_variants').update({ cost_price_slsh: item.costPriceSlsh }).eq('id', item.variantId)

    await admin.from('stock_movements').insert({
      product_id: item.productId,
      variant_id: item.variantId,
      location_id: locationId,
      movement_type: 'receive',
      quantity_change: item.quantity,
      reference_type: 'receive',
      notes: item.notes ?? null,
      performed_by: userId,
    })

    results.push({ productId: item.productId, variantId: item.variantId, newQuantity })
  }

  return NextResponse.json({ success: true, results })
}
