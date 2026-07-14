'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, PackageX, SlidersHorizontal } from 'lucide-react'

import { ProductGrid } from '@/components/product-grid'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { SimpleSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'name'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price (Low to High)' },
  { value: 'price_desc', label: 'Price (High to Low)' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A-Z' },
]

interface CategoryNode {
  id: string
  name_en: string
  name_so: string
  children: CategoryNode[]
}

function findCategory(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findCategory(node.children, id)
    if (found) return found
  }
  return null
}

export default function CategoryPage() {
  // The home page's category cards link here with the category's UUID as
  // the [slug] param (src/app/(customer)/page.tsx) — categories have no
  // separate human-readable slug column, so this route is keyed by id.
  const { slug: categoryId } = useParams<{ slug: string }>()
  const locale = useLocale()
  const router = useRouter()

  const [sort, setSort] = useState<SortOption>('relevance')
  const [page, setPage] = useState(1)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      return (await res.json()) as { categories: CategoryNode[] }
    },
  })
  const category = categoriesData ? findCategory(categoriesData.categories, categoryId) : null
  const categoryName = category ? (locale === 'so' ? category.name_so : category.name_en) : null

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { categoryId, sort, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ category_id: categoryId, sort, page: String(page) })
      const res = await fetch(`/api/products?${params.toString()}`)
      return res.json()
    },
  })

  const products = productsData?.data ?? []
  const totalCount = productsData?.totalCount ?? 0
  const totalPages = productsData?.totalPages ?? 1

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-stone-500">
        <Link href="/" className="hover:text-orange-600">
          Home
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="font-medium text-stone-900">{categoryName ?? '…'}</span>
      </nav>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
          {categoryName ?? 'Category'}
        </h1>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/products?category=${categoryId}`}>
            <SlidersHorizontal className="size-4" />
            More filters
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-stone-600">
          {isLoading ? 'Loading…' : `${totalCount} products found`}
        </p>
        <SimpleSelect
          value={sort}
          onValueChange={(value) => {
            setSort(value as SortOption)
            setPage(1)
          }}
          options={SORT_OPTIONS}
        />
      </div>

      {!isLoading && products.length === 0 ? (
        <EmptyState
          icon={PackageX}
          title="No products in this category yet"
          description="Check back soon, or browse the full catalog instead."
          ctaLabel="Browse all products"
          onCtaClick={() => router.push('/products')}
        />
      ) : (
        <ProductGrid products={products} isLoading={isLoading} />
      )}

      <div className="mt-8">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
