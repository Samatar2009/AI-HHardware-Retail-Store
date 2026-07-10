import { forwardRef, useId } from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string
}

const Switch = forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId()
    const switchId = id ?? generatedId

    const control = (
      <SwitchPrimitive.Root
        ref={ref}
        id={switchId}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-stone-200 transition-colors duration-150',
          'motion-reduce:transition-none motion-reduce:duration-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-orange-500',
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150',
            'motion-reduce:transition-none motion-reduce:duration-0',
            'data-[state=checked]:translate-x-[22px]'
          )}
        />
      </SwitchPrimitive.Root>
    )

    if (!label) return control

    return (
      <div className="flex items-center gap-2">
        {control}
        <label htmlFor={switchId} className="text-sm font-medium text-stone-700">
          {label}
        </label>
      </div>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
