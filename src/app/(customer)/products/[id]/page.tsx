import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { toProductCardProps } from '@/lib/catalog'
import { ProductDetailView } from '@/components/product-detail-view'
import { ProductCard } from '@/components/product-card'

export const revalidate = 60

async function getProduct(id: string) {
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(
      `*,
       category:categories(id, name_en, name_so, parent_id),
       product_images(*),
       product_variants(*, inventory(location_id, quantity_on_hand, quantity_reserved, threshold))`
    )
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!product) return null

  let parentCategory: { id: string; name_en: string; name_so: string } | null = null
  if (product.category?.parent_id) {
    const { data } = await supabase
      .from('categories')
      .select('id, name_en, name_so')
      .eq('id', product.category.parent_id)
      .single()
    parentCategory = data
  }

  const { data: related } = await supabase
    .from('products')
    .select(
      `id, name_en, name_so, brand,
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', id)
    .limit(6)

  return { product, parentCategory, related: (related ?? []).map((p) => toProductCardProps(p)) }
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const data = await getProduct(params.id)
  if (!data) notFound()

  const { product, parentCategory, related } = data

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-sm text-stone-500"
      >
        <Link href="/" className="hover:text-stone-700">
          Home
        </Link>
        {parentCategory && (
          <>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <Link href={`/categories/${parentCategory.id}`} className="hover:text-stone-700">
              {parentCategory.name_en}
            </Link>
          </>
        )}
        {product.category && (
          <>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <Link href={`/categories/${product.category.id}`} className="hover:text-stone-700">
              {product.category.name_en}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="font-medium text-stone-900" aria-current="page">
          {product.name_en}
        </span>
      </nav>

      <ProductDetailView product={product} />

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-bold leading-8 text-stone-900">Related Products</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {related.map((p) => (
              <div key={p.id} className="w-48 shrink-0">
                <ProductCard {...p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
