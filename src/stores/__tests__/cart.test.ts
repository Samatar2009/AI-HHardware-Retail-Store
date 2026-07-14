import { beforeEach, describe, expect, it } from 'vitest'

import { useCartStore } from '@/stores/cart.store'
import type { CartItem } from '@/types/order'

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'product-1',
    variantId: 'variant-1',
    sku: 'SKU-1',
    nameEn: 'Hammer',
    nameSo: 'Dubbe',
    quantity: 1,
    unitPriceSlsh: 50000,
    imageUrl: null,
    ...overrides,
  }
}

describe('cart.store', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      appliedCode: null,
      loyaltyRedemption: null,
      locationId: null,
    })
  })

  it('adds a new line item', () => {
    useCartStore.getState().addItem(makeItem())
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0]?.productId).toBe('product-1')
  })

  it('merges quantities when the same product/variant is added again', () => {
    useCartStore.getState().addItem(makeItem({ quantity: 2 }))
    useCartStore.getState().addItem(makeItem({ quantity: 3 }))

    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]?.quantity).toBe(5)
  })

  it('keeps distinct variants as separate lines', () => {
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-1' }))
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-2' }))

    expect(useCartStore.getState().items).toHaveLength(2)
  })

  it('removes a line item', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().removeItem('product-1', 'variant-1')

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updates quantity for an existing line', () => {
    useCartStore.getState().addItem(makeItem({ quantity: 1 }))
    useCartStore.getState().updateQty('product-1', 'variant-1', 7)

    expect(useCartStore.getState().items[0]?.quantity).toBe(7)
  })

  it('stores an applied discount code without altering item totals', () => {
    useCartStore.getState().addItem(makeItem({ quantity: 2, unitPriceSlsh: 50000 }))
    useCartStore.getState().applyCode('WELCOME10')

    const state = useCartStore.getState()
    expect(state.appliedCode).toBe('WELCOME10')
    const subtotal = state.items.reduce((sum, item) => sum + item.unitPriceSlsh * item.quantity, 0)
    expect(subtotal).toBe(100000)
  })

  it('clears items, applied code, and loyalty redemption on clearCart', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().applyCode('WELCOME10')
    useCartStore.getState().setLoyaltyRedemption(50)

    useCartStore.getState().clearCart()

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(0)
    expect(state.appliedCode).toBeNull()
    expect(state.loyaltyRedemption).toBeNull()
  })
})
