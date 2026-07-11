'use client'

import { formatSLSH, slshToUsd } from '@/lib/utils'
import { useCurrencyStore } from '@/stores/currency.store'

interface PriceDisplayProps {
  amountSlsh: number
  className?: string
}

function PriceDisplay({ amountSlsh, className }: PriceDisplayProps) {
  const displayCurrency = useCurrencyStore((s) => s.displayCurrency)
  const exchangeRate = useCurrencyStore((s) => s.exchangeRate)

  return (
    <div className={className}>
      <p className="text-base font-bold text-stone-900">{formatSLSH(amountSlsh)}</p>
      {displayCurrency === 'USD' && exchangeRate > 0 && (
        <p className="text-xs text-stone-500">{slshToUsd(amountSlsh, exchangeRate)}</p>
      )}
    </div>
  )
}

export { PriceDisplay }
