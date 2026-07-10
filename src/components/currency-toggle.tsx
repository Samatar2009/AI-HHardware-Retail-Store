'use client'

import { useCurrencyStore } from '@/stores/currency.store'
import { cn } from '@/lib/utils'

function CurrencyToggle({ className }: { className?: string }) {
  const displayCurrency = useCurrencyStore((s) => s.displayCurrency)
  const toggleCurrency = useCurrencyStore((s) => s.toggleCurrency)

  return (
    <button
      type="button"
      onClick={toggleCurrency}
      aria-label="Toggle currency"
      className={cn(
        'inline-flex items-center rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700',
        'transition-colors duration-100 motion-reduce:transition-none motion-reduce:duration-0',
        'hover:bg-stone-50',
        className
      )}
    >
      <span className={displayCurrency === 'SLSH' ? 'text-orange-600' : ''}>SLSH</span>
      <span className="mx-1 text-stone-300">/</span>
      <span className={displayCurrency === 'USD' ? 'text-orange-600' : ''}>USD</span>
    </button>
  )
}

export { CurrencyToggle }
