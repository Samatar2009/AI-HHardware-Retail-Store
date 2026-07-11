import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { toProductCardProps } from '@/lib/catalog'

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'name'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')
  const search = searchParams.get('search')
  const locationId = searchParams.get('location_id')
  const sort = (searchParams.get('sort') as SortOption) ?? 'relevance'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '24')))
  const minPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null
  const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null
  const inStockOnly = searchParams.get('in_stock_only') === 'true'
  const brands = searchParams.get('brands')?.split(',').filter(Boolean) ?? []

  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(
      `id, name_en, name_so, brand, created_at,
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(id, price_slsh, is_active,
         inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
    .eq('is_active', true)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (search) {
    // PostgREST's .or() filter string treats , ( ) as syntax — strip them
    // so user input can't inject extra filter clauses.
    const safeSearch = search.replace(/[,()%*\\]/g, ' ').trim().slice(0, 100)
    if (safeSearch) {
      query = query.or(`name_en.ilike.%${safeSearch}%,name_so.ilike.%${safeSearch}%,sku_base.ilike.%${safeSearch}%`)
    }
  }
  if (brands.length) query = query.in('brand', brands)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Could not load products' }, { status: 500 })
  }

  let enriched = (data ?? []).map((p) => ({ ...toProductCardProps(p, locationId), createdAt: p.created_at }))

  // Facet metadata computed before price/in-stock/brand filters are applied,
  // so the filter UI's own options don't shrink to nothing once selected.
  const availableBrands = [...new Set(enriched.map((p) => p.brand).filter((b): b is string => !!b))].sort()
  const priceBounds =
    enriched.length > 0
      ? { min: Math.min(...enriched.map((p) => p.priceSlsh)), max: Math.max(...enriched.map((p) => p.priceSlsh)) }
      : { min: 0, max: 0 }

  if (minPrice !== null) enriched = enriched.filter((p) => p.priceSlsh >= minPrice)
  if (maxPrice !== null) enriched = enriched.filter((p) => p.priceSlsh <= maxPrice)
  if (inStockOnly) enriched = enriched.filter((p) => p.stockStatus !== 'out_of_stock')

  const sorters: Record<SortOption, (a: (typeof enriched)[number], b: (typeof enriched)[number]) => number> = {
    relevance: () => 0,
    price_asc: (a, b) => a.priceSlsh - b.priceSlsh,
    price_desc: (a, b) => b.priceSlsh - a.priceSlsh,
    newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    name: (a, b) => a.nameEn.localeCompare(b.nameEn),
  }
  enriched.sort(sorters[sort] ?? sorters.relevance)

  const totalCount = enriched.length
  const start = (page - 1) * limit
  const pageItems = enriched.slice(start, start + limit).map(({ createdAt: _createdAt, ...rest }) => rest)

  return NextResponse.json({
    data: pageItems,
    page,
    pageSize: limit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    facets: { brands: availableBrands, priceBounds },
  })
}
