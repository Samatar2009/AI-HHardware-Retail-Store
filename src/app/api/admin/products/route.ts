import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name_en), product_variants(id), product_images(thumbnail_url, sort_order)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Could not load products' }, { status: 500 })
  }

  return NextResponse.json({ products: data })
}

const createProductSchema = z.object({
  nameEn: z.string().min(1).max(200),
  nameSo: z.string().min(1).max(200),
  descriptionEn: z.string().max(2000).optional(),
  descriptionSo: z.string().max(2000).optional(),
  categoryId: z.string().uuid(),
  brand: z.string().max(100).optional(),
  unit: z.string().max(20).default('each'),
  skuBase: z.string().min(1).max(50),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  variant: z.object({
    sku: z.string().min(1).max(50),
    priceSlsh: z.number().int().positive(),
    costPriceSlsh: z.number().int().nonnegative(),
    attributes: z.record(z.string()).default({}),
    imageUrl: z.string().url().optional(),
  }),
})

export async function POST(request: Request) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = createProductSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product data', details: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()

  const { data: category } = await supabase.from('categories').select('id').eq('id', body.categoryId).single()
  if (!category) {
    return NextResponse.json({ error: 'Category does not exist' }, { status: 400 })
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name_en: body.nameEn,
      name_so: body.nameSo,
      description_en: body.descriptionEn ?? null,
      description_so: body.descriptionSo ?? null,
      category_id: body.categoryId,
      brand: body.brand ?? null,
      unit: body.unit,
      sku_base: body.skuBase,
      tags: body.tags,
      is_featured: body.isFeatured,
      cost_price_slsh: body.variant.costPriceSlsh,
    })
    .select()
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Could not create product' }, { status: 500 })
  }

  const { data: variant, error: variantError } = await supabase
    .from('product_variants')
    .insert({
      product_id: product.id,
      sku: body.variant.sku,
      price_slsh: body.variant.priceSlsh,
      cost_price_slsh: body.variant.costPriceSlsh,
      attributes: body.variant.attributes,
      image_url: body.variant.imageUrl ?? null,
    })
    .select()
    .single()

  if (variantError || !variant) {
    return NextResponse.json({ error: 'Product created, but could not create initial variant' }, { status: 500 })
  }

  return NextResponse.json({ product, variant })
}
