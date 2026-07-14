import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => (key === 'addToCart' ? 'Add to Cart' : key),
}))

import { ProductCard } from '@/components/product-card'
import { useCurrencyStore } from '@/stores/currency.store'

const baseProps = {
  id: 'product-1',
  nameEn: 'Claw Hammer',
  nameSo: 'Dubbe',
  brand: 'Stanley',
  thumbnailUrl: null,
  priceSlsh: 125000,
  stockStatus: 'in_stock' as const,
}

describe('ProductCard', () => {
  it('renders the product name and SLSH price', () => {
    render(<ProductCard {...baseProps} />)
    expect(screen.getByText('Claw Hammer')).toBeInTheDocument()
    expect(screen.getByText('125,000 SLSH')).toBeInTheDocument()
  })

  it('shows the USD equivalent below the SLSH price when the currency store is set to USD', () => {
    act(() => useCurrencyStore.setState({ displayCurrency: 'USD', exchangeRate: 570 }))
    render(<ProductCard {...baseProps} />)
    expect(screen.getByText('125,000 SLSH')).toBeInTheDocument()
    expect(screen.getByText('$219.30')).toBeInTheDocument()
    act(() => useCurrencyStore.setState({ displayCurrency: 'SLSH', exchangeRate: 0 }))
  })

  it('shows an in-stock badge and an enabled add-to-cart button', () => {
    render(<ProductCard {...baseProps} />)
    expect(screen.getByText('In Stock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeEnabled()
  })

  it('shows a low-stock badge', () => {
    render(<ProductCard {...baseProps} stockStatus="low_stock" />)
    expect(screen.getByText('Low Stock')).toBeInTheDocument()
  })

  it('disables the add-to-cart button and shows an out-of-stock badge when unavailable', () => {
    render(<ProductCard {...baseProps} stockStatus="out_of_stock" />)
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeDisabled()
  })

  it('calls onAddToCart when the button is clicked', () => {
    const onAddToCart = vi.fn()
    render(<ProductCard {...baseProps} onAddToCart={onAddToCart} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }))
    expect(onAddToCart).toHaveBeenCalledTimes(1)
  })
})
