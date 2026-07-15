import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select(
      `*,
       category:categories(id, name_en, name_so, parent_id),
       product_images(*),
       product_variants(*, inventory(location_id, quantity_on_hand, quantity_reserved, threshold))`
    )
    .eq('id', params.id)
    .eq('is_active', true)
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const { data: related } = await supabase
    .from('products')
    .select(
      'id, name_en, name_so, brand, product_images(image_url, thumbnail_url, sort_order), product_variants(price_slsh, is_active)'
    )
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', params.id)
    .limit(6)

  return NextResponse.json({ product, related: related ?? [] })
}
