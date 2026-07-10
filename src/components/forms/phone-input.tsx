import { forwardRef, useId } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { E164_SOMALILAND_PATTERN } from '@/lib/validators'

const COUNTRY_PREFIX = '+252'

export interface PhoneInputProps {
  value: string
  onChange: (e164Value: string) => void
  onBlur?: () => void
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  id?: string
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onBlur, label, error, required, disabled, id }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const localDigits = value.startsWith(COUNTRY_PREFIX) ? value.slice(COUNTRY_PREFIX.length) : value
    const isValid = E164_SOMALILAND_PATTERN.test(value)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
      onChange(COUNTRY_PREFIX + digits)
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
            {COUNTRY_PREFIX}
          </span>
          <input
            id={inputId}
            ref={ref}
            type="tel"
            inputMode="numeric"
            disabled={disabled}
            value={localDigits}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder="638315010"
            aria-invalid={!!error}
            className={cn(
              'h-10 w-full rounded-md border border-stone-300 bg-white py-2 pl-12 pr-3 text-sm text-stone-900 placeholder:text-stone-400',
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
          localDigits.length > 0 &&
          isValid && (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Valid phone number
            </p>
          )
        )}
      </div>
    )
  }
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
