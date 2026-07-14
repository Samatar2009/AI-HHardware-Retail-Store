import { describe, expect, it } from 'vitest'

import { deriveStockStatus, toProductCardProps } from '@/lib/catalog'

const LOCATION_A = 'location-a'
const LOCATION_B = 'location-b'

describe('deriveStockStatus', () => {
  it('is out_of_stock when available quantity is zero or negative', () => {
    const variants = [
      {
        price_slsh: 1000,
        is_active: true,
        inventory: [
          { quantity_on_hand: 2, quantity_reserved: 2, threshold: 5, location_id: LOCATION_A },
        ],
      },
    ]
    expect(deriveStockStatus(variants, LOCATION_A)).toBe('out_of_stock')
  })

  it('is low_stock when available is positive but at or below the threshold', () => {
    const variants = [
      {
        price_slsh: 1000,
        is_active: true,
        inventory: [
          { quantity_on_hand: 5, quantity_reserved: 0, threshold: 5, location_id: LOCATION_A },
        ],
      },
    ]
    expect(deriveStockStatus(variants, LOCATION_A)).toBe('low_stock')
  })

  it('is in_stock when available comfortably exceeds the threshold', () => {
    const variants = [
      {
        price_slsh: 1000,
        is_active: true,
        inventory: [
          { quantity_on_hand: 50, quantity_reserved: 0, threshold: 5, location_id: LOCATION_A },
        ],
      },
    ]
    expect(deriveStockStatus(variants, LOCATION_A)).toBe('in_stock')
  })

  it('ignores inventory rows from other locations when a location filter is given', () => {
    const variants = [
      {
        price_slsh: 1000,
        is_active: true,
        inventory: [
          { quantity_on_hand: 50, quantity_reserved: 0, threshold: 5, location_id: LOCATION_A },
          { quantity_on_hand: 0, quantity_reserved: 0, threshold: 5, location_id: LOCATION_B },
        ],
      },
    ]
    expect(deriveStockStatus(variants, LOCATION_B)).toBe('out_of_stock')
    expect(deriveStockStatus(variants, LOCATION_A)).toBe('in_stock')
  })

  it('sums across all locations when no location filter is given', () => {
    const variants = [
      {
        price_slsh: 1000,
        is_active: true,
        inventory: [
          { quantity_on_hand: 3, quantity_reserved: 0, threshold: 2, location_id: LOCATION_A },
          { quantity_on_hand: 3, quantity_reserved: 0, threshold: 2, location_id: LOCATION_B },
        ],
      },
    ]
    expect(deriveStockStatus(variants, null)).toBe('in_stock')
  })

  it('treats a variant with no inventory rows as contributing nothing', () => {
    const variants = [{ price_slsh: 1000, is_active: true }]
    expect(deriveStockStatus(variants, LOCATION_A)).toBe('out_of_stock')
  })
})

describe('toProductCardProps', () => {
  const baseProduct = {
    id: 'product-1',
    name_en: 'Claw Hammer',
    name_so: 'Dubbe',
    brand: 'Stanley',
    product_images: [],
    product_variants: [],
  }

  it('picks the lowest price among active variants', () => {
    const product = {
      ...baseProduct,
      product_variants: [
        { price_slsh: 20000, is_active: true },
        { price_slsh: 15000, is_active: true },
        { price_slsh: 5000, is_active: false },
      ],
    }
    expect(toProductCardProps(product).priceSlsh).toBe(15000)
  })

  it('defaults to a price of 0 when there are no active variants', () => {
    const product = { ...baseProduct, product_variants: [{ price_slsh: 20000, is_active: false }] }
    expect(toProductCardProps(product).priceSlsh).toBe(0)
  })

  it('falls back to a null thumbnail when there are no images', () => {
    expect(toProductCardProps(baseProduct).thumbnailUrl).toBeNull()
  })

  it('picks the lowest sort_order image as the thumbnail', () => {
    const product = {
      ...baseProduct,
      product_images: [
        { image_url: 'full-2.jpg', thumbnail_url: 'thumb-2.jpg', sort_order: 2 },
        { image_url: 'full-1.jpg', thumbnail_url: 'thumb-1.jpg', sort_order: 1 },
      ],
    }
    expect(toProductCardProps(product).thumbnailUrl).toBe('thumb-1.jpg')
  })
})
