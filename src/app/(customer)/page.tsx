import Link from 'next/link'
import { Hammer } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { toProductCardProps } from '@/lib/catalog'
import { BannerCarousel } from '@/components/banner-carousel'
import { CategoryCard } from '@/components/category-card'
import { ProductGrid } from '@/components/product-grid'
import { LoyaltyTeaser } from '@/components/loyalty-teaser'

export const revalidate = 60

async function getHomePageData() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [bannersResult, categoriesResult, featuredResult] = await Promise.all([
    supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .eq('scope_type', 'all')
      .lte('active_from', now)
      .gte('active_until', now)
      .order('sort_order', { ascending: true }),
    supabase.rpc('get_category_tree'),
    supabase
      .from('products')
      .select(
        `id, name_en, name_so, brand,
         product_images(image_url, thumbnail_url, sort_order),
         product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
      )
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('updated_at', { ascending: false })
      .limit(8),
  ])

  return {
    banners: bannersResult.data ?? [],
    categories: (categoriesResult.data ?? []).filter((c) => c.parent_id === null),
    featured: (featuredResult.data ?? []).map((p) => toProductCardProps(p)),
  }
}

export default async function HomePage() {
  const { banners, categories, featured } = await getHomePageData()

  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8">
      {banners.length > 0 && (
        <BannerCarousel
          banners={banners.map((b) => ({
            id: b.id,
            imageUrl: b.image_url,
            linkUrl: b.cta_url,
            altText: b.title_en,
          }))}
        />
      )}

      <section>
        <h2 className="mb-4 text-2xl font-bold leading-8 text-stone-900">Shop by Category</h2>
        <div className="grid auto-cols-[45%] grid-flow-col grid-rows-2 gap-4 overflow-x-auto pb-2 md:auto-cols-auto md:grid-flow-row md:grid-cols-4 md:grid-rows-1 md:overflow-visible">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              slug={category.id}
              nameEn={category.name_en}
              nameSo={category.name_so}
              iconUrl={category.icon_url}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold leading-8 text-stone-900">Featured Products</h2>
        <ProductGrid products={featured} />
      </section>

      <Link
        href="/ai/estimate"
        className="flex items-center gap-4 rounded-lg bg-orange-500 p-6 text-white transition-colors duration-100 hover:bg-orange-600"
      >
        <Hammer className="size-8" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold">Planning a project?</p>
          <p className="text-sm text-orange-50">
            Let our AI assistant estimate the materials you&apos;ll need
          </p>
        </div>
      </Link>

      <LoyaltyTeaser />
    </div>
  )
}
