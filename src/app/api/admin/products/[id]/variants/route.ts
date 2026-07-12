import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const createVariantSchema = z.object({
  sku: z.string().min(1).max(50),
  priceSlsh: z.number().int().positive(),
  costPriceSlsh: z.number().int().nonnegative(),
  attributes: z.record(z.string()).default({}),
  imageUrl: z.string().url().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = createVariantSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid variant data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data: product } = await supabase.from('products').select('id').eq('id', params.id).single()
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: params.id,
      sku: body.sku,
      price_slsh: body.priceSlsh,
      cost_price_slsh: body.costPriceSlsh,
      attributes: body.attributes,
      image_url: body.imageUrl ?? null,
    })
    .select()
    .single()

  if (error || !variant) {
    return NextResponse.json({ error: 'Could not create variant' }, { status: 500 })
  }

  return NextResponse.json({ variant })
}
