import { forwardRef, useId } from 'react'
import { AlertCircle } from 'lucide-react'

import { cn, slshToUsd } from '@/lib/utils'
import { useCurrencyStore } from '@/stores/currency.store'

export interface PriceInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  onBlur?: () => void
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  id?: string
}

const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ value, onChange, onBlur, label, error, helperText, required, disabled, id }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const exchangeRate = useCurrencyStore((s) => s.exchangeRate)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value
      onChange(raw === '' ? undefined : Number(raw))
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-stone-700">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
            SLSH
          </span>
          <input
            id={inputId}
            ref={ref}
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            disabled={disabled}
            value={value ?? ''}
            onChange={handleChange}
            onBlur={onBlur}
            aria-invalid={!!error}
            className={cn(
              'h-10 w-full rounded-md border border-stone-300 bg-white py-2 pl-14 pr-3 text-right text-sm text-stone-900',
              'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
              'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 focus:border-orange-500',
              'disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400',
              error && 'border-red-500 focus:ring-red-500'
            )}
          />
        </div>
        {error ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {error}
          </p>
        ) : (
          <div className="mt-1 flex items-center justify-between">
            {helperText && <p className="text-xs text-stone-500">{helperText}</p>}
            {value !== undefined && exchangeRate > 0 && (
              <p className="ml-auto text-xs text-stone-500">{slshToUsd(value, exchangeRate)}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
PriceInput.displayName = 'PriceInput'

export { PriceInput }
