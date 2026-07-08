import type { Row } from './database'

export type Product = Row<'products'>
export type ProductVariant = Row<'product_variants'>
export type ProductImage = Row<'product_images'>
export type Category = Row<'categories'>
export type ProductEmbedding = Row<'product_embeddings'>

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
  images: ProductImage[]
  category: Category | null
}

export interface SearchResult {
  id: string
  nameEn: string
  nameSo: string
  skuBase: string
  thumbnailUrl: string | null
  priceSlsh: number
  similarity?: number
}
