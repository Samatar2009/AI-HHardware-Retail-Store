import { create } from 'zustand'

export type DisplayCurrency = 'SLSH' | 'USD'

interface CurrencyState {
  exchangeRate: number
  displayCurrency: DisplayCurrency
  setRate: (rate: number) => void
  toggleCurrency: () => void
  initRate: () => Promise<void>
}

export const useCurrencyStore = create<CurrencyState>()((set) => ({
  exchangeRate: 0,
  displayCurrency: 'SLSH',
  setRate: (rate) => set({ exchangeRate: rate }),
  toggleCurrency: () =>
    set((state) => ({ displayCurrency: state.displayCurrency === 'SLSH' ? 'USD' : 'SLSH' })),
  initRate: async () => {
    // Calls the public exchange-rate API route (built in a later phase).
    // Silently no-ops if unavailable so callers can invoke this eagerly.
    try {
      const res = await fetch('/api/public/exchange-rate')
      if (!res.ok) return
      const { rate } = (await res.json()) as { rate: number }
      set({ exchangeRate: rate })
    } catch {
      // offline or route not yet implemented — keep existing rate
    }
  },
}))
