import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { toProductCardProps } from '@/lib/catalog'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location_id')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      `id, name_en, name_so, brand,
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })
    .limit(8)

  if (error) {
    return NextResponse.json({ error: 'Could not load featured products' }, { status: 500 })
  }

  const products = (data ?? []).map((p) => toProductCardProps(p, locationId))

  return NextResponse.json({ products })
}
