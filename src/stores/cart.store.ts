import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { CartItem } from '@/types/order'

function isSameLine(a: CartItem, productId: string, variantId: string | null) {
  return a.productId === productId && a.variantId === variantId
}

interface CartState {
  items: CartItem[]
  appliedCode: string | null
  loyaltyRedemption: number | null
  locationId: string | null
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQty: (productId: string, variantId: string | null, quantity: number) => void
  applyCode: (code: string | null) => void
  setLoyaltyRedemption: (points: number | null) => void
  setLocationId: (locationId: string | null) => void
  clearCart: () => void
}

// Note: Phase 12 (offline-queue.ts) syncs this store's persisted state to
// IndexedDB for full offline access. Until then, localStorage persistence
// alone covers Phase 2's scope.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      appliedCode: null,
      loyaltyRedemption: null,
      locationId: null,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((line) => isSameLine(line, item.productId, item.variantId))
          if (existing) {
            return {
              items: state.items.map((line) =>
                isSameLine(line, item.productId, item.variantId)
                  ? { ...line, quantity: line.quantity + item.quantity }
                  : line
              ),
            }
          }
          return { items: [...state.items, item] }
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((line) => !isSameLine(line, productId, variantId)),
        })),
      updateQty: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items.map((line) =>
            isSameLine(line, productId, variantId) ? { ...line, quantity } : line
          ),
        })),
      applyCode: (code) => set({ appliedCode: code }),
      setLoyaltyRedemption: (points) => set({ loyaltyRedemption: points }),
      setLocationId: (locationId) => set({ locationId }),
      clearCart: () => set({ items: [], appliedCode: null, loyaltyRedemption: null }),
    }),
    {
      name: 'borama-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
