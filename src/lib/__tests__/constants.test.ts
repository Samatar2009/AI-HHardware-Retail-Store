import { describe, expect, it } from 'vitest'

import {
  ORDER_STATUSES,
  PARKED_CART_EXPIRY_HOURS,
  PAYMENT_METHODS,
  POINTS_PER_SLSH,
  RESERVATION_TIMEOUT_MINUTES,
  ROLE_HOME_PATH,
  USER_ROLES,
} from '@/lib/constants'

describe('constants', () => {
  it('lists all five payment methods', () => {
    expect(PAYMENT_METHODS).toEqual(['zaad', 'edahab', 'evc_plus', 'sahal', 'cash_on_pickup'])
  })

  it('lists all six order statuses in lifecycle order', () => {
    expect(ORDER_STATUSES).toEqual([
      'pending_payment',
      'payment_submitted',
      'payment_confirmed',
      'ready_for_pickup',
      'completed',
      'cancelled',
    ])
  })

  it('lists all four user roles', () => {
    expect(USER_ROLES).toEqual(['customer', 'cashier', 'inventory_manager', 'admin'])
  })

  it('maps every user role to a home path', () => {
    for (const role of USER_ROLES) {
      expect(ROLE_HOME_PATH[role]).toMatch(/^\//)
    }
  })

  it('sends cashiers to open a POS session, not straight to the till', () => {
    expect(ROLE_HOME_PATH.cashier).toBe('/pos/open-session')
  })

  it('awards 1 point per 1,000 SLSH spent', () => {
    expect(POINTS_PER_SLSH).toBe(0.001)
    expect(Math.round(100000 * POINTS_PER_SLSH)).toBe(100)
  })

  it('has sane reservation and parked-cart expiry windows', () => {
    expect(RESERVATION_TIMEOUT_MINUTES).toBe(30)
    expect(PARKED_CART_EXPIRY_HOURS).toBe(4)
  })
})
