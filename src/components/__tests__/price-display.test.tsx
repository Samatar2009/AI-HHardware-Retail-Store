import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PriceDisplay } from '@/components/price-display'
import { useCurrencyStore } from '@/stores/currency.store'

// useCurrencyStore.setState() outside of act() triggers a React "not
// wrapped in act" warning once a component is subscribed to the store, even
// when the mutation happens in an unrelated test's cleanup — wrapping every
// mutation keeps the suite warning-free.
function setCurrencyState(partial: Partial<ReturnType<typeof useCurrencyStore.getState>>) {
  act(() => {
    useCurrencyStore.setState(partial)
  })
}

describe('PriceDisplay', () => {
  afterEach(() => {
    setCurrencyState({ displayCurrency: 'SLSH', exchangeRate: 0 })
  })

  it('shows the SLSH amount when displayCurrency is SLSH', () => {
    setCurrencyState({ displayCurrency: 'SLSH', exchangeRate: 570 })
    render(<PriceDisplay amountSlsh={125000} />)

    expect(screen.getByText('125,000 SLSH')).toBeInTheDocument()
    expect(screen.queryByText('$219.30')).not.toBeInTheDocument()
  })

  it('shows the USD equivalent when displayCurrency is USD and a rate is set', () => {
    setCurrencyState({ displayCurrency: 'USD', exchangeRate: 570 })
    render(<PriceDisplay amountSlsh={125000} />)

    expect(screen.getByText('125,000 SLSH')).toBeInTheDocument()
    expect(screen.getByText('$219.30')).toBeInTheDocument()
  })

  it('hides the USD line when displayCurrency is USD but no rate has loaded yet', () => {
    setCurrencyState({ displayCurrency: 'USD', exchangeRate: 0 })
    render(<PriceDisplay amountSlsh={125000} />)

    expect(screen.getByText('125,000 SLSH')).toBeInTheDocument()
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument()
  })

  it('updates when the exchange rate changes', () => {
    setCurrencyState({ displayCurrency: 'USD', exchangeRate: 570 })
    const { rerender } = render(<PriceDisplay amountSlsh={125000} />)
    expect(screen.getByText('$219.30')).toBeInTheDocument()

    setCurrencyState({ exchangeRate: 500 })
    rerender(<PriceDisplay amountSlsh={125000} />)
    expect(screen.getByText('$250.00')).toBeInTheDocument()
  })
})
