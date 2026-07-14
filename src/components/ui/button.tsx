import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-orange-500 text-white rounded-md font-semibold hover:bg-orange-600 active:bg-orange-700 active:scale-[0.98] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed',
        secondary:
          'bg-white text-stone-700 border border-stone-300 rounded-md font-medium hover:bg-stone-50 hover:border-stone-400 active:bg-stone-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        ghost:
          'bg-transparent text-stone-700 rounded-md font-medium hover:bg-stone-100 active:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed',
        destructive:
          'bg-red-500 text-white rounded-md font-semibold hover:bg-red-600 active:bg-red-700 active:scale-[0.98] disabled:bg-stone-200 disabled:text-stone-400',
        link: 'text-orange-600 underline-offset-4 rounded-sm font-medium hover:underline hover:text-orange-700 active:text-orange-800 disabled:text-stone-400 disabled:no-underline',
      },
      size: {
        sm: 'h-8 px-3 py-1.5 text-xs gap-1.5 [&_svg]:size-3.5',
        md: 'h-10 px-4 py-2 text-sm gap-2 [&_svg]:size-4',
        lg: 'h-12 px-6 py-2.5 text-base gap-2 [&_svg]:size-5',
        icon: 'h-10 w-10 p-0 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    // Radix's Slot requires exactly one child (it clones Button's props onto
    // it), so asChild usage can't also splice in a sibling loading spinner —
    // only the plain <button> case renders the two as siblings.
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
