import { create } from 'zustand'

import type { Row } from '@/types/database'
import type { CartItem } from '@/types/order'
import type { ParkedCart, PosSession } from '@/types/pos'

type Profile = Row<'profiles'>

function isSameLine(a: CartItem, productId: string, variantId: string | null) {
  return a.productId === productId && a.variantId === variantId
}

interface PosState {
  activeSession: PosSession | null
  activeCart: CartItem[]
  parkedCarts: ParkedCart[]
  activeCustomer: Profile | null
  setActiveSession: (session: PosSession | null) => void
  setParkedCarts: (carts: ParkedCart[]) => void
  setActiveCustomer: (customer: Profile | null) => void
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, variantId: string | null) => void
  updateCartQty: (productId: string, variantId: string | null, quantity: number) => void
  clearActiveCart: () => void
  parkActiveCart: (parked: ParkedCart) => void
  removeParkedCart: (id: string) => void
}

// Note: Phase 12 (offline-queue.ts) wires this store into an IndexedDB-backed
// offline transaction queue for the POS terminal. Phase 2 only establishes
// the in-memory shape and lifecycle actions.
export const usePosStore = create<PosState>()((set) => ({
  activeSession: null,
  activeCart: [],
  parkedCarts: [],
  activeCustomer: null,
  setActiveSession: (session) => set({ activeSession: session }),
  setParkedCarts: (carts) => set({ parkedCarts: carts }),
  setActiveCustomer: (customer) => set({ activeCustomer: customer }),
  addToCart: (item) =>
    set((state) => {
      const existing = state.activeCart.find((line) => isSameLine(line, item.productId, item.variantId))
      if (existing) {
        return {
          activeCart: state.activeCart.map((line) =>
            isSameLine(line, item.productId, item.variantId)
              ? { ...line, quantity: line.quantity + item.quantity }
              : line
          ),
        }
      }
      return { activeCart: [...state.activeCart, item] }
    }),
  removeFromCart: (productId, variantId) =>
    set((state) => ({
      activeCart: state.activeCart.filter((line) => !isSameLine(line, productId, variantId)),
    })),
  updateCartQty: (productId, variantId, quantity) =>
    set((state) => ({
      activeCart: state.activeCart.map((line) =>
        isSameLine(line, productId, variantId) ? { ...line, quantity } : line
      ),
    })),
  clearActiveCart: () => set({ activeCart: [], activeCustomer: null }),
  parkActiveCart: (parked) =>
    set((state) => ({
      parkedCarts: [...state.parkedCarts, parked],
      activeCart: [],
      activeCustomer: null,
    })),
  removeParkedCart: (id) =>
    set((state) => ({
      parkedCarts: state.parkedCarts.filter((cart) => cart.id !== id),
    })),
}))
