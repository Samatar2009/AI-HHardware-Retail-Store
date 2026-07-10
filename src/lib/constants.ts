import type { UserRole } from '@/types/auth'
import type { OrderStatus, PaymentMethod } from '@/types/order'

export const PAYMENT_METHODS: PaymentMethod[] = ['zaad', 'edahab', 'evc_plus', 'sahal', 'cash_on_pickup']

export const ORDER_STATUSES: OrderStatus[] = [
  'pending_payment',
  'payment_submitted',
  'payment_confirmed',
  'ready_for_pickup',
  'completed',
  'cancelled',
]

export const USER_ROLES: UserRole[] = ['customer', 'cashier', 'inventory_manager', 'admin']

// Where each role lands after sign-in (Build Plan Phase 4 checkpoint +
// App Flow doc Section 2.3 — cashiers open a POS session before the till).
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  customer: '/',
  cashier: '/pos/open-session',
  inventory_manager: '/inventory/dashboard',
  admin: '/admin/dashboard',
}

// 1 loyalty point per 1,000 SLSH spent
export const POINTS_PER_SLSH = 0.001

export const RESERVATION_TIMEOUT_MINUTES = 30

export const PARKED_CART_EXPIRY_HOURS = 4
