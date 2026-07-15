import { ArrowDown, ArrowUp } from 'lucide-react'

import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: string
  trendPct?: number
}

function KpiCard({ icon: Icon, label, value, trendPct }: KpiCardProps) {
  const isUp = (trendPct ?? 0) >= 0

  return (
    <div className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{label}</p>
        <Icon className="size-5 text-stone-400" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      {trendPct !== undefined && (
        <p
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            isUp ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isUp ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          {Math.abs(trendPct).toFixed(1)}% vs yesterday
        </p>
      )}
    </div>
  )
}

export { KpiCard }
