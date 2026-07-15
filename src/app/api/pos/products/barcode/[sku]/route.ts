import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET(_request: Request, { params }: { params: { sku: string } }) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('location_id')
    .eq('user_id', userId)
    .single()
  if (!profile?.location_id) {
    return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
  }

  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, sku, price_slsh, attributes, product_id, product:products(id, name_en, name_so)')
    .eq('sku', params.sku)
    .eq('is_active', true)
    .maybeSingle()

  if (!variant || !variant.product) {
    return NextResponse.json({ error: 'No product found for this barcode' }, { status: 404 })
  }

  const { data: inventory } = await supabase
    .from('inventory')
    .select('quantity_on_hand, quantity_reserved')
    .eq('product_id', variant.product_id)
    .eq('variant_id', variant.id)
    .eq('location_id', profile.location_id)
    .maybeSingle()

  const product = variant.product as unknown as { id: string; name_en: string; name_so: string }

  return NextResponse.json({
    result: {
      variantId: variant.id,
      productId: product.id,
      nameEn: product.name_en,
      nameSo: product.name_so,
      sku: variant.sku,
      priceSlsh: variant.price_slsh,
      attributes: variant.attributes,
      available: inventory ? inventory.quantity_on_hand - inventory.quantity_reserved : 0,
    },
  })
}
