import type { badgeVariants } from '@/components/ui/badge'
import type { OrderStatus } from '@/types/order'

type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>['variant']

export const ORDER_STATUS_BADGE: Record<OrderStatus, { variant: BadgeVariant; label: string }> = {
  pending_payment: { variant: 'orderPendingVerification', label: 'Pending Verification' },
  payment_submitted: { variant: 'orderPendingVerification', label: 'Pending Verification' },
  payment_confirmed: { variant: 'orderConfirmed', label: 'Confirmed' },
  ready_for_pickup: { variant: 'orderReadyForPickup', label: 'Ready for Pickup' },
  completed: { variant: 'orderCompleted', label: 'Completed' },
  cancelled: { variant: 'orderCancelled', label: 'Cancelled' },
}
