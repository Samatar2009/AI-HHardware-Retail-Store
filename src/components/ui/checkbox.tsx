import { forwardRef, useId } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string
}

const Checkbox = forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId()
    const checkboxId = id ?? generatedId

    const control = (
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          'h-4 w-4 shrink-0 rounded-sm border border-stone-300 bg-white',
          'transition-colors duration-100 motion-reduce:transition-none motion-reduce:duration-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-0',
          'data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    )

    if (!label) return control

    return (
      <div className="flex items-center gap-2">
        {control}
        <label htmlFor={checkboxId} className="text-sm font-medium text-stone-700">
          {label}
        </label>
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
