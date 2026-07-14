import { beforeEach, describe, expect, it } from 'vitest'

import { useCurrencyStore } from '@/stores/currency.store'
import { formatSLSH, slshToUsd } from '@/lib/utils'

describe('currency.store', () => {
  beforeEach(() => {
    useCurrencyStore.setState({ exchangeRate: 0, displayCurrency: 'SLSH' })
  })

  it('defaults to SLSH display currency', () => {
    expect(useCurrencyStore.getState().displayCurrency).toBe('SLSH')
  })

  it('toggles between SLSH and USD', () => {
    useCurrencyStore.getState().toggleCurrency()
    expect(useCurrencyStore.getState().displayCurrency).toBe('USD')

    useCurrencyStore.getState().toggleCurrency()
    expect(useCurrencyStore.getState().displayCurrency).toBe('SLSH')
  })

  it('sets the exchange rate', () => {
    useCurrencyStore.getState().setRate(570)
    expect(useCurrencyStore.getState().exchangeRate).toBe(570)
  })

  it('formats an amount consistently with the stored rate', () => {
    useCurrencyStore.getState().setRate(570)
    const { exchangeRate } = useCurrencyStore.getState()

    expect(formatSLSH(570000)).toBe('570,000 SLSH')
    expect(slshToUsd(570000, exchangeRate)).toBe('$1000.00')
  })
})
