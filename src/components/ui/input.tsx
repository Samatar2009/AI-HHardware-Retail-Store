import { forwardRef, useId } from 'react'
import { AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, required, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-stone-700">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 [&_svg]:size-4">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={cn(
              'h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400',
              'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
              'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 focus:border-orange-500',
              'disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400',
              error && 'border-red-500 focus:ring-red-500',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 [&_svg]:size-4">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {error}
          </p>
        ) : (
          helperText && (
            <p id={`${inputId}-helper`} className="mt-1 text-xs text-stone-500">
              {helperText}
            </p>
          )
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
