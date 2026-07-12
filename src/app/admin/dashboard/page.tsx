import Link from 'next/link'
import { AlertTriangle, DollarSign, Monitor, Package } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { formatDate, formatSLSH } from '@/lib/utils'
import { ORDER_STATUS_BADGE } from '@/lib/order-status'
import { KpiCard } from '@/components/admin/kpi-card'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/page-header'
import type { OrderStatus } from '@/types/order'

export const revalidate = 0

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

async function getDashboardData() {
  const supabase = await createClient()

  const todayStart = startOfDay(new Date()).toISOString()
  const yesterdayStart = startOfDay(new Date(Date.now() - 86400000)).toISOString()
  const sevenDaysStart = startOfDay(new Date(Date.now() - 6 * 86400000)).toISOString()

  const [todayOrders, yesterdayOrders, lowStockCount, activeSessions, recentOrders, weekOrders] = await Promise.all([
    supabase.from('orders').select('total_slsh').gte('created_at', todayStart).neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('total_slsh')
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart)
      .neq('status', 'cancelled'),
    supabase.from('inventory_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
    supabase.from('pos_sessions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase
      .from('orders')
      .select('id, order_number, created_at, status, total_slsh, customer:profiles!orders_customer_id_fkey(phone)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('orders').select('created_at, total_slsh').gte('created_at', sevenDaysStart).neq('status', 'cancelled'),
  ])

  const todayRevenue = (todayOrders.data ?? []).reduce((sum, o) => sum + o.total_slsh, 0)
  const yesterdayRevenue = (yesterdayOrders.data ?? []).reduce((sum, o) => sum + o.total_slsh, 0)
  const revenueTrend = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0

  const revenueByDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const date = startOfDay(new Date(Date.now() - i * 86400000)).toISOString().slice(0, 10)
    revenueByDay[date] = 0
  }
  for (const order of weekOrders.data ?? []) {
    const day = order.created_at.slice(0, 10)
    if (day in revenueByDay) revenueByDay[day] += order.total_slsh
  }

  return {
    todayRevenue,
    todayOrderCount: todayOrders.data?.length ?? 0,
    revenueTrend,
    lowStockCount: lowStockCount.count ?? 0,
    activeSessions: activeSessions.count ?? 0,
    recentOrders: (recentOrders.data ?? []) as unknown as {
      id: string
      order_number: string
      created_at: string
      status: OrderStatus
      total_slsh: number
      customer: { phone: string } | null
    }[],
    revenueChartData: Object.entries(revenueByDay).map(([date, revenueSlsh]) => ({ date, revenueSlsh })),
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={DollarSign} label="Today's Revenue" value={formatSLSH(data.todayRevenue)} trendPct={data.revenueTrend} />
        <KpiCard icon={Package} label="Orders Today" value={String(data.todayOrderCount)} />
        <KpiCard icon={AlertTriangle} label="Low Stock Alerts" value={String(data.lowStockCount)} />
        <KpiCard icon={Monitor} label="Active POS Sessions" value={String(data.activeSessions)} />
      </div>

      <div className="mt-6">
        <RevenueChart data={data.revenueChartData} />
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-200 p-4">
          <p className="text-sm font-semibold text-stone-900">Recent Orders</p>
        </div>
        <div className="divide-y divide-stone-100">
          {data.recentOrders.map((order) => {
            const badge = ORDER_STATUS_BADGE[order.status]
            return (
              <Link
                key={order.id}
                href={`/admin/orders?highlight=${order.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-stone-50"
              >
                <div>
                  <p className="font-medium text-stone-900">{order.order_number}</p>
                  <p className="text-xs text-stone-500">{order.customer?.phone ?? '—'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <span className="font-semibold text-stone-900">{formatSLSH(order.total_slsh)}</span>
                  <span className="text-xs text-stone-400">{formatDate(order.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
