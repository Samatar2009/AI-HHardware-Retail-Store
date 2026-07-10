import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// All 18 variants from Guidelines doc Section 8.3 (Badges & Status Chips).
const badgeVariants = cva('inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      orderPendingVerification: 'bg-amber-50 text-amber-700 border-amber-300',
      orderConfirmed: 'bg-blue-50 text-blue-700 border-blue-300',
      orderReadyForPickup: 'bg-violet-50 text-violet-700 border-violet-300',
      orderCompleted: 'bg-green-50 text-green-700 border-green-300',
      orderCancelled: 'bg-stone-100 text-stone-600 border-stone-300',
      stockInStock: 'bg-green-50 text-green-700 border-green-300',
      stockLowStock: 'bg-amber-50 text-amber-700 border-amber-300',
      stockOutOfStock: 'bg-red-50 text-red-700 border-red-300',
      roleAdmin: 'bg-orange-50 text-orange-700 border-orange-300',
      roleCashier: 'bg-blue-50 text-blue-700 border-blue-300',
      roleInventoryManager: 'bg-green-50 text-green-700 border-green-300',
      loyaltyBronze: 'bg-orange-50 text-orange-800 border-orange-300',
      loyaltySilver: 'bg-stone-100 text-stone-700 border-stone-400',
      loyaltyGold: 'bg-amber-50 text-amber-800 border-amber-400',
      paymentVerified: 'bg-green-50 text-green-700 border-green-300',
      paymentPending: 'bg-amber-50 text-amber-700 border-amber-300',
      posOffline: 'bg-red-50 text-red-700 border-red-300 font-bold',
      posOnline: 'bg-green-50 text-green-700 border-green-300 font-bold',
    },
  },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Colour-blind-friendly filled dot prepended to the label. */
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
