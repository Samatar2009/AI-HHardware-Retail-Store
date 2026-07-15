import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

interface VariantRow {
  id: string
  sku: string
  price_slsh: number
  attributes: Record<string, string>
  product_id: string
  product: { id: string; name_en: string; name_so: string } | null
}

interface PosSearchResult {
  variantId: string
  productId: string
  nameEn: string
  nameSo: string
  sku: string
  priceSlsh: number
  attributes: Record<string, string>
  available: number
}

async function attachAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variants: VariantRow[],
  locationId: string
): Promise<PosSearchResult[]> {
  const productIds = variants.map((v) => v.product_id)
  const { data: inventoryRows } = await supabase
    .from('inventory')
    .select('product_id, variant_id, quantity_on_hand, quantity_reserved')
    .eq('location_id', locationId)
    .in('product_id', productIds)

  return variants
    .filter((v) => v.product)
    .map((v) => {
      const inv = (inventoryRows ?? []).find((i) => i.variant_id === v.id)
      return {
        variantId: v.id,
        productId: v.product!.id,
        nameEn: v.product!.name_en,
        nameSo: v.product!.name_so,
        sku: v.sku,
        priceSlsh: v.price_slsh,
        attributes: v.attributes,
        available: inv ? inv.quantity_on_hand - inv.quantity_reserved : 0,
      }
    })
}

export async function GET(request: Request) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('location_id')
    .eq('user_id', userId)
    .single()
  if (!profile?.location_id) {
    return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
  }

  const safeQuery = q
    .replace(/[,()%*\\]/g, ' ')
    .trim()
    .slice(0, 100)

  const [{ data: bySku }, { data: byName }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, sku, price_slsh, attributes, product_id, product:products(id, name_en, name_so)')
      .eq('is_active', true)
      .ilike('sku', `%${safeQuery}%`)
      .limit(20),
    supabase
      .from('products')
      .select('id, name_en, name_so, product_variants(id, sku, price_slsh, attributes, is_active)')
      .eq('is_active', true)
      .ilike('name_en', `%${safeQuery}%`)
      .limit(20),
  ])

  const variantMap = new Map<string, VariantRow>()
  for (const v of (bySku ?? []) as unknown as VariantRow[]) variantMap.set(v.id, v)
  for (const p of byName ?? []) {
    for (const v of p.product_variants as {
      id: string
      sku: string
      price_slsh: number
      attributes: Record<string, string>
      is_active: boolean
    }[]) {
      if (!v.is_active) continue
      variantMap.set(v.id, {
        id: v.id,
        sku: v.sku,
        price_slsh: v.price_slsh,
        attributes: v.attributes,
        product_id: p.id,
        product: { id: p.id, name_en: p.name_en, name_so: p.name_so },
      })
    }
  }

  const results = await attachAvailability(supabase, [...variantMap.values()], profile.location_id)

  return NextResponse.json({ results: results.slice(0, 20) })
}
