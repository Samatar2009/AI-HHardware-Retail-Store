import { describe, expect, it } from 'vitest'

import { ORDER_STATUS_BADGE } from '@/lib/order-status'
import { ORDER_STATUSES } from '@/lib/constants'

describe('ORDER_STATUS_BADGE', () => {
  it('has a badge entry for every order status', () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_BADGE[status]).toBeDefined()
      expect(ORDER_STATUS_BADGE[status]?.label).toBeTruthy()
      expect(ORDER_STATUS_BADGE[status]?.variant).toBeTruthy()
    }
  })

  it('maps both pending_payment and payment_submitted to the same "Pending Verification" state', () => {
    expect(ORDER_STATUS_BADGE.pending_payment).toEqual(ORDER_STATUS_BADGE.payment_submitted)
  })

  it('maps completed and cancelled to distinct terminal-state badges', () => {
    expect(ORDER_STATUS_BADGE.completed.variant).toBe('orderCompleted')
    expect(ORDER_STATUS_BADGE.cancelled.variant).toBe('orderCancelled')
    expect(ORDER_STATUS_BADGE.completed.variant).not.toBe(ORDER_STATUS_BADGE.cancelled.variant)
  })
})
