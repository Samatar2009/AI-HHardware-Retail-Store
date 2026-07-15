import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/ai'
import { rateLimiters } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'
import { toProductCardProps } from '@/lib/catalog'

const bodySchema = z.object({
  query: z.string().min(1).max(200),
  location_id: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimiters.search.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many search requests. Please try again shortly.' },
      { status: 429 }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid search query' }, { status: 400 })
  }
  const { query, location_id: locationId } = parsed.data

  const supabase = await createClient()

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedText(query)
  } catch {
    return NextResponse.json(
      { error: 'Search is temporarily unavailable. Please try again.' },
      { status: 502 }
    )
  }

  const { data: matches, error: matchError } = await supabase.rpc('match_products_semantic', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_limit: 20,
    p_location_id: locationId ?? undefined,
  })

  if (matchError) {
    console.error('match_products_semantic error:', matchError)
    return NextResponse.json({ error: 'Could not run semantic search' }, { status: 500 })
  }

  const productIds = (matches ?? []).map((m) => m.product_id)
  if (productIds.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(
      `id, name_en, name_so, brand,
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
    .in('id', productIds)
    .eq('is_active', true)

  if (productsError) {
    return NextResponse.json({ error: 'Could not load search results' }, { status: 500 })
  }

  const byId = new Map(
    (products ?? []).map((p) => [p.id, toProductCardProps(p, locationId ?? null)])
  )
  const results = productIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)

  return NextResponse.json({ results })
}
