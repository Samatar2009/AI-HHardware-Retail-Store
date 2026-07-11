'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, PackageX } from 'lucide-react'

import { ProductGrid } from '@/components/product-grid'
import { ProductFilters, type ProductFiltersState } from '@/components/product-filters'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { SimpleSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  MobileBottomSheet,
  MobileBottomSheetContent,
  MobileBottomSheetTrigger,
} from '@/components/mobile-bottom-sheet'

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

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters: ProductFiltersState = useMemo(
    () => ({
      categoryId: searchParams.get('category'),
      minPrice: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null,
      maxPrice: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null,
      inStockOnly: searchParams.get('in_stock') === 'true',
      brands: searchParams.get('brands')?.split(',').filter(Boolean) ?? [],
    }),
    [searchParams]
  )
  const sort = (searchParams.get('sort') as SortOption) ?? 'relevance'
  const page = Number(searchParams.get('page') ?? '1')
  const search = searchParams.get('search')

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }
      router.push(`/products?${params.toString()}`)
    },
    [router, searchParams]
  )

  function handleFiltersChange(next: ProductFiltersState) {
    updateParams({
      category: next.categoryId,
      min_price: next.minPrice?.toString() ?? null,
      max_price: next.maxPrice?.toString() ?? null,
      in_stock: next.inStockOnly ? 'true' : null,
      brands: next.brands.length ? next.brands.join(',') : null,
      page: null,
    })
  }

  function handleClearFilters() {
    updateParams({
      category: null,
      min_price: null,
      max_price: null,
      in_stock: null,
      brands: null,
      page: null,
    })
  }

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      return (await res.json()) as { categories: CategoryNode[] }
    },
  })

  const productsQueryKey = ['products', { search, categoryId: filters.categoryId, sort, page, filters }]
  const { data: productsData, isLoading } = useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filters.categoryId) params.set('category_id', filters.categoryId)
      if (filters.minPrice !== null) params.set('min_price', String(filters.minPrice))
      if (filters.maxPrice !== null) params.set('max_price', String(filters.maxPrice))
      if (filters.inStockOnly) params.set('in_stock_only', 'true')
      if (filters.brands.length) params.set('brands', filters.brands.join(','))
      params.set('sort', sort)
      params.set('page', String(page))

      const res = await fetch(`/api/products?${params.toString()}`)
      return res.json()
    },
  })

  const categories = categoriesData?.categories ?? []
  const products = productsData?.data ?? []
  const totalCount = productsData?.totalCount ?? 0
  const totalPages = productsData?.totalPages ?? 1
  const facets = productsData?.facets ?? { brands: [], priceBounds: { min: 0, max: 0 } }

  const filterPanel = (
    <ProductFilters
      categories={categories}
      availableBrands={facets.brands}
      priceBounds={facets.priceBounds}
      filters={filters}
      onChange={handleFiltersChange}
      onClear={handleClearFilters}
    />
  )

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">{filterPanel}</aside>

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-stone-600">{isLoading ? 'Loading…' : `${totalCount} products found`}</p>

            <div className="flex items-center gap-2">
              <MobileBottomSheet>
                <MobileBottomSheetTrigger asChild>
                  <Button variant="secondary" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="size-4" />
                    Filters
                  </Button>
                </MobileBottomSheetTrigger>
                <MobileBottomSheetContent>{filterPanel}</MobileBottomSheetContent>
              </MobileBottomSheet>

              <SimpleSelect
                value={sort}
                onValueChange={(value) => updateParams({ sort: value, page: null })}
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          {!isLoading && products.length === 0 ? (
            <EmptyState
              icon={PackageX}
              title="No products found"
              description="Try adjusting your filters or search terms."
              ctaLabel="Clear filters"
              onCtaClick={handleClearFilters}
            />
          ) : (
            <ProductGrid products={products} isLoading={isLoading} />
          )}

          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} onPageChange={(p) => updateParams({ page: String(p) })} />
          </div>
        </div>
      </div>
    </div>
  )
}
