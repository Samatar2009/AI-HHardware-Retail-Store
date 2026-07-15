import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const updateVariantSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  priceSlsh: z.number().int().positive().optional(),
  costPriceSlsh: z.number().int().nonnegative().optional(),
  attributes: z.record(z.string()).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = updateVariantSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid variant data' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.sku !== undefined) updates.sku = body.sku
  if (body.priceSlsh !== undefined) updates.price_slsh = body.priceSlsh
  if (body.costPriceSlsh !== undefined) updates.cost_price_slsh = body.costPriceSlsh
  if (body.attributes !== undefined) updates.attributes = body.attributes
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl
  if (body.isActive !== undefined) updates.is_active = body.isActive

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_variants')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update variant' }, { status: 500 })
  }

  return NextResponse.json({ variant: data })
}
