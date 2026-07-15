'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { PriceDisplay } from '@/components/price-display'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ProductCardProps {
  id: string
  nameEn: string
  nameSo: string
  brand?: string | null
  thumbnailUrl?: string | null
  priceSlsh: number
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  onAddToCart?: () => void
}

const STOCK_BADGE = {
  in_stock: { variant: 'stockInStock' as const, label: 'In Stock' },
  low_stock: { variant: 'stockLowStock' as const, label: 'Low Stock' },
  out_of_stock: { variant: 'stockOutOfStock' as const, label: 'Out of Stock' },
}

function ProductCard({
  id,
  nameEn,
  nameSo,
  brand,
  thumbnailUrl,
  priceSlsh,
  stockStatus,
  onAddToCart,
}: ProductCardProps) {
  const locale = useLocale()
  const t = useTranslations('products')
  const name = locale === 'so' ? nameSo : nameEn
  const stock = STOCK_BADGE[stockStatus]

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-lg border border-stone-200 bg-white',
        'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
        'hover:border-orange-300 hover:shadow-md'
      )}
    >
      <Link href={`/products/${id}`}>
        <div className="aspect-square overflow-hidden bg-stone-100">
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            />
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-2 p-3">
        {brand && <p className="text-xs text-stone-500">{brand}</p>}
        <Link href={`/products/${id}`}>
          <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">{name}</h3>
        </Link>
        <Badge variant={stock.variant}>{stock.label}</Badge>
        <PriceDisplay amountSlsh={priceSlsh} />
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={onAddToCart}
          disabled={stockStatus === 'out_of_stock'}
        >
          {t('addToCart')}
        </Button>
      </div>
    </div>
  )
}

export { ProductCard }
