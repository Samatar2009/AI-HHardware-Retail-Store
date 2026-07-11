import type { Row } from './database'

export type Order = Row<'orders'>
export type OrderItem = Row<'order_items'>

export type OrderStatus =
  | 'pending_payment'
  | 'payment_submitted'
  | 'payment_confirmed'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled'

export type PaymentMethod = 'zaad' | 'edahab' | 'evc_plus' | 'sahal' | 'cash_on_pickup'

export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'failed'

export interface CartItem {
  productId: string
  variantId: string | null
  sku: string
  nameEn: string
  nameSo: string
  quantity: number
  unitPriceSlsh: number
  imageUrl: string | null
  variantAttributes?: Record<string, string>
}
