import { formatSLSH } from '@/lib/utils'

interface RevenueDay {
  date: string
  revenueSlsh: number
}

function RevenueChart({ data }: { data: RevenueDay[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenueSlsh))

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <p className="mb-4 text-sm font-semibold text-stone-900">Revenue — Last 7 Days</p>
      <div className="flex h-40 items-end gap-2">
        {data.map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-orange-500 transition-all duration-300 motion-reduce:transition-none"
              style={{ height: `${Math.max(4, (day.revenueSlsh / max) * 100)}%` }}
              title={formatSLSH(day.revenueSlsh)}
            />
            <span className="text-[10px] text-stone-400">
              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { RevenueChart }
