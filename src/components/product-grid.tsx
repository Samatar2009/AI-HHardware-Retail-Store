import { ProductCard, type ProductCardProps } from '@/components/product-card'
import { Skeleton, SkeletonProductImage } from '@/components/ui/skeleton'

interface ProductGridProps {
  products?: ProductCardProps[]
  isLoading?: boolean
  skeletonCount?: number
}

function ProductGrid({ products, isLoading, skeletonCount = 8 }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 overflow-hidden rounded-lg border border-stone-200 bg-white">
            <SkeletonProductImage className="rounded-none" />
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products?.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  )
}

export { ProductGrid }
