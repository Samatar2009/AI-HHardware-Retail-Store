import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

interface VariantResult {
  id: string
  sku: string
  attributes: Record<string, string>
  cost_price_slsh: number
  is_active: boolean
}

interface ProductResult {
  id: string
  name_en: string
  sku_base: string
  product_variants: VariantResult[]
}

export async function GET(request: Request) {
  const { error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 2) {
    return NextResponse.json({ products: [] })
  }

  const supabase = await createClient()
  const safeQuery = q.replace(/[,()%*\\]/g, ' ').trim().slice(0, 100)

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name_en, sku_base, product_variants(id, sku, attributes, cost_price_slsh, is_active)')
    .or(`name_en.ilike.%${safeQuery}%,sku_base.ilike.%${safeQuery}%`)
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  // Also match directly on variant SKU (e.g. barcode scan result), which the
  // product-level ilike above can't reach.
  const { data: variantMatches } = await supabase
    .from('product_variants')
    .select('id, sku, attributes, cost_price_slsh, is_active, product:products(id, name_en, sku_base)')
    .ilike('sku', `%${safeQuery}%`)
    .limit(20)

  const byId = new Map<string, ProductResult>()
  for (const p of (products ?? []) as ProductResult[]) byId.set(p.id, p)

  for (const v of variantMatches ?? []) {
    const product = v.product as unknown as { id: string; name_en: string; sku_base: string } | null
    if (!product) continue
    const variant: VariantResult = {
      id: v.id,
      sku: v.sku,
      attributes: (v.attributes as Record<string, string>) ?? {},
      cost_price_slsh: v.cost_price_slsh,
      is_active: v.is_active,
    }

    const existing = byId.get(product.id)
    if (existing) {
      if (!existing.product_variants.some((ev) => ev.id === v.id)) existing.product_variants.push(variant)
    } else {
      byId.set(product.id, { id: product.id, name_en: product.name_en, sku_base: product.sku_base, product_variants: [variant] })
    }
  }

  return NextResponse.json({ products: [...byId.values()] })
}
