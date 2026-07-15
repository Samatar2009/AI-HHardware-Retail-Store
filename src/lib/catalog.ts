import type { ProductCardProps } from '@/components/product-card'

interface InventoryRow {
  quantity_on_hand: number
  quantity_reserved: number
  threshold: number
  location_id: string
}

interface VariantWithInventory {
  price_slsh: number
  is_active: boolean
  inventory?: InventoryRow[]
}

interface ImageRow {
  image_url: string
  thumbnail_url: string
  sort_order: number
}

interface ProductForCard {
  id: string
  name_en: string
  name_so: string
  brand: string | null
  product_images: ImageRow[]
  product_variants: VariantWithInventory[]
}

export function deriveStockStatus(
  variants: VariantWithInventory[],
  locationId: string | null
): ProductCardProps['stockStatus'] {
  let available = 0
  let thresholdSum = 0

  for (const variant of variants) {
    for (const inv of variant.inventory ?? []) {
      if (locationId && inv.location_id !== locationId) continue
      available += inv.quantity_on_hand - inv.quantity_reserved
      thresholdSum += inv.threshold
    }
  }

  if (available <= 0) return 'out_of_stock'
  if (available <= thresholdSum) return 'low_stock'
  return 'in_stock'
}

export function toProductCardProps(
  product: ProductForCard,
  locationId: string | null = null
): ProductCardProps {
  const activeVariants = product.product_variants.filter((v) => v.is_active)
  const prices = activeVariants.map((v) => v.price_slsh)
  const image = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]

  return {
    id: product.id,
    nameEn: product.name_en,
    nameSo: product.name_so,
    brand: product.brand,
    thumbnailUrl: image?.thumbnail_url ?? null,
    priceSlsh: prices.length ? Math.min(...prices) : 0,
    stockStatus: deriveStockStatus(product.product_variants, locationId),
  }
}
