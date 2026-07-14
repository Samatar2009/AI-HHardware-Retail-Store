import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Badge, badgeVariants } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// All 18 variants from Guidelines doc Section 8.3 (Badges & Status Chips) —
// mirrors the variant keys defined in src/components/ui/badge.tsx exactly.
const ALL_VARIANTS = [
  'orderPendingVerification',
  'orderConfirmed',
  'orderReadyForPickup',
  'orderCompleted',
  'orderCancelled',
  'stockInStock',
  'stockLowStock',
  'stockOutOfStock',
  'roleAdmin',
  'roleCashier',
  'roleInventoryManager',
  'loyaltyBronze',
  'loyaltySilver',
  'loyaltyGold',
  'paymentVerified',
  'paymentPending',
  'posOffline',
  'posOnline',
] as const

describe('Badge', () => {
  it('has exactly 18 variants defined', () => {
    expect(ALL_VARIANTS).toHaveLength(18)
  })

  it.each(ALL_VARIANTS)('renders the %s variant with its label and colour classes', (variant) => {
    render(<Badge variant={variant}>Status</Badge>)
    const badge = screen.getByText('Status')
    // Badge itself pipes badgeVariants() through cn() (twMerge), which
    // dedupes conflicting utilities (e.g. posOffline/posOnline override the
    // base font-medium with font-bold) — compare against that same
    // deduped output rather than the raw cva string.
    const expectedClasses = cn(badgeVariants({ variant })).split(' ')
    for (const cls of expectedClasses) {
      expect(badge.className).toContain(cls)
    }
  })

  it('renders a leading dot when dot is true', () => {
    render(
      <Badge variant="stockInStock" dot>
        In Stock
      </Badge>
    )
    const badge = screen.getByText('In Stock')
    expect(badge.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('does not render a dot by default', () => {
    render(<Badge variant="stockInStock">In Stock</Badge>)
    const badge = screen.getByText('In Stock')
    expect(badge.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
  })
})
