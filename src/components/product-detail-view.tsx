'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Minus, Plus, Star } from 'lucide-react'

import { cn, formatSLSH, slshToUsd } from '@/lib/utils'
import { POINTS_PER_SLSH } from '@/lib/constants'
import { useCartStore } from '@/stores/cart.store'
import { useCurrencyStore } from '@/stores/currency.store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { showSuccessToast } from '@/components/ui/toast'

interface ImageRow {
  id: string
  image_url: string
  thumbnail_url: string
  sort_order: number
}

interface InventoryRow {
  location_id: string
  quantity_on_hand: number
  quantity_reserved: number
  threshold: number
}

interface VariantRow {
  id: string
  sku: string
  attributes: unknown
  price_slsh: number
  image_url: string | null
  is_active: boolean
  inventory: InventoryRow[]
}

function normalizeAttributes(attributes: unknown): Record<string, string> {
  if (!attributes || typeof attributes !== 'object') return {}
  return attributes as Record<string, string>
}

interface ProductDetailData {
  id: string
  name_en: string
  name_so: string
  description_en: string | null
  description_so: string | null
  brand: string | null
  unit: string
  tags: string[]
  product_images: ImageRow[]
  product_variants: VariantRow[]
}

const STOCK_BADGE = {
  in_stock: { variant: 'stockInStock' as const, label: 'In Stock' },
  low_stock: { variant: 'stockLowStock' as const, label: 'Low Stock' },
  out_of_stock: { variant: 'stockOutOfStock' as const, label: 'Out of Stock' },
}

function variantAvailability(variant: VariantRow) {
  const available = variant.inventory.reduce((sum, inv) => sum + (inv.quantity_on_hand - inv.quantity_reserved), 0)
  const threshold = variant.inventory.reduce((sum, inv) => sum + inv.threshold, 0)
  const status = available <= 0 ? 'out_of_stock' : available <= threshold ? 'low_stock' : 'in_stock'
  return { available, status: status as keyof typeof STOCK_BADGE }
}

function ProductDetailView({ product }: { product: ProductDetailData }) {
  const locale = useLocale()
  const t = useTranslations('products')
  const tCart = useTranslations('cart')
  const addItem = useCartStore((s) => s.addItem)
  const exchangeRate = useCurrencyStore((s) => s.exchangeRate)

  const activeVariants = useMemo(
    () =>
      product.product_variants
        .filter((v) => v.is_active)
        .map((v) => ({ ...v, attributes: normalizeAttributes(v.attributes) })),
    [product.product_variants]
  )
  const attributeKeys = useMemo(
    () => [...new Set(activeVariants.flatMap((v) => Object.keys(v.attributes)))],
    [activeVariants]
  )

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(() => {
    const first = activeVariants[0]
    return first ? { ...first.attributes } : {}
  })
  const [quantity, setQuantity] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const selectedVariant =
    activeVariants.find((v) => attributeKeys.every((key) => v.attributes[key] === selectedAttrs[key])) ??
    activeVariants[0]

  const { available, status } = selectedVariant
    ? variantAvailability(selectedVariant)
    : { available: 0, status: 'out_of_stock' as const }

  const name = locale === 'so' ? product.name_so : product.name_en
  const description = locale === 'so' ? product.description_so : product.description_en

  const images = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)
  const displayImageUrl = selectedVariant?.image_url ?? images[activeImageIndex]?.image_url

  const pointsToEarn = selectedVariant ? Math.floor(selectedVariant.price_slsh * quantity * POINTS_PER_SLSH) : 0

  function handleAddToCart() {
    if (!selectedVariant || status === 'out_of_stock') return
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      nameEn: product.name_en,
      nameSo: product.name_so,
      quantity,
      unitPriceSlsh: selectedVariant.price_slsh,
      imageUrl: displayImageUrl ?? null,
      variantAttributes: selectedVariant.attributes,
    })
    showSuccessToast(tCart('title'), `${name} ${tCart('quantity').toLowerCase()}: ${quantity}`)
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Image gallery */}
      <div>
        <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
          {displayImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImageUrl}
              alt={name}
              className="size-full object-cover transition-transform duration-300 hover:scale-105 md:cursor-zoom-in"
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveImageIndex(i)}
                className={cn(
                  'size-16 overflow-hidden rounded-md border-2',
                  i === activeImageIndex ? 'border-orange-500' : 'border-stone-200'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumbnail_url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-4">
        {product.brand && <p className="text-sm text-stone-500">{product.brand}</p>}
        <h1 className="text-3xl font-bold leading-[38px] text-stone-900">{name}</h1>

        <div>
          <p className="text-3xl font-bold text-stone-900">{formatSLSH(selectedVariant?.price_slsh ?? 0)}</p>
          {exchangeRate > 0 && (
            <p className="text-sm text-stone-500">{slshToUsd(selectedVariant?.price_slsh ?? 0, exchangeRate)}</p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-orange-600">
            <Star className="size-3.5" aria-hidden="true" />
            Earn {pointsToEarn} points
          </p>
        </div>

        <div>
          <Badge variant={STOCK_BADGE[status].variant}>{STOCK_BADGE[status].label}</Badge>
          {status === 'low_stock' && <span className="ml-2 text-xs text-stone-500">Only {available} left</span>}
        </div>

        {attributeKeys.map((key) => (
          <div key={key}>
            <p className="mb-1.5 text-sm font-medium text-stone-700 capitalize">{key.replace('_', ' ')}</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(activeVariants.map((v) => v.attributes[key]))].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedAttrs((prev) => ({ ...prev, [key]: value }))}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm font-medium',
                    'transition-colors duration-100 motion-reduce:transition-none motion-reduce:duration-0',
                    selectedAttrs[key] === value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-stone-300 text-stone-700 hover:bg-stone-50'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border border-stone-300">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2.5 text-stone-600 hover:bg-stone-100"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="p-2.5 text-stone-600 hover:bg-stone-100"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={status === 'out_of_stock'}
            onClick={handleAddToCart}
          >
            {t('addToCart')}
          </Button>
        </div>

        <Tabs defaultValue="description" className="mt-4">
          <TabsList>
            <TabsTrigger value="description">{t('description')}</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="brand">Brand</TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <p className="text-sm text-stone-600">{description}</p>
          </TabsContent>
          <TabsContent value="specifications">
            <dl className="flex flex-col gap-1 text-sm">
              {selectedVariant &&
                Object.entries(selectedVariant.attributes).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-stone-100 py-1.5">
                    <dt className="capitalize text-stone-500">{key.replace('_', ' ')}</dt>
                    <dd className="font-medium text-stone-900">{value}</dd>
                  </div>
                ))}
              <div className="flex justify-between border-b border-stone-100 py-1.5">
                <dt className="text-stone-500">SKU</dt>
                <dd className="font-medium text-stone-900">{selectedVariant?.sku}</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-stone-500">Unit</dt>
                <dd className="font-medium text-stone-900">{product.unit}</dd>
              </div>
            </dl>
          </TabsContent>
          <TabsContent value="brand">
            <p className="text-sm text-stone-600">{product.brand ?? 'Unbranded'}</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export { ProductDetailView }
