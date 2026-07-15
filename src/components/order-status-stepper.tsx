import { Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/order'

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending_payment', label: 'Pending Payment' },
  { status: 'payment_submitted', label: 'Payment Submitted' },
  { status: 'payment_confirmed', label: 'Payment Confirmed' },
  { status: 'ready_for_pickup', label: 'Ready for Pickup' },
  { status: 'completed', label: 'Completed' },
]

function OrderStatusStepper({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-4 text-red-700">
        <X className="size-5" aria-hidden="true" />
        <span className="text-sm font-medium">This order was cancelled.</span>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((step) => step.status === status)

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        const isUpcoming = i > currentIndex

        return (
          <div
            key={step.status}
            className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  'transition-colors duration-150 motion-reduce:transition-none motion-reduce:duration-0',
                  isComplete && 'border-orange-500 bg-orange-500 text-white',
                  isCurrent && 'border-orange-500 bg-white text-orange-600',
                  isUpcoming && 'border-stone-300 bg-white text-stone-400'
                )}
              >
                {isComplete ? <Check className="size-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'w-20 text-center text-xs font-medium',
                  isUpcoming ? 'text-stone-400' : 'text-stone-700'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1', isComplete ? 'bg-orange-500' : 'bg-stone-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export { OrderStatusStepper }
