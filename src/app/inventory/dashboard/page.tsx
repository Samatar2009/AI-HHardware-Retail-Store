import Link from 'next/link'
import { AlertTriangle, Boxes, DollarSign, PackageX } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { formatDate, formatSLSH } from '@/lib/utils'
import { KpiCard } from '@/components/admin/kpi-card'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'

export const revalidate = 0

async function resolveLocationId(userId: string, role: string | undefined) {
  const supabase = await createClient()
  if (role === 'inventory_manager') {
    const { data } = await supabase
      .from('profiles')
      .select('location_id')
      .eq('user_id', userId)
      .single()
    return data?.location_id ?? null
  }
  const { data } = await supabase
    .from('locations')
    .select('id')
    .eq('is_active', true)
    .order('name_en')
    .limit(1)
    .single()
  return data?.id ?? null
}

async function getDashboardData(locationId: string) {
  const supabase = await createClient()

  const [inventoryRows, unresolvedAlerts, recentMovements] = await Promise.all([
    supabase
      .from('inventory')
      .select('quantity_on_hand, threshold, variant:product_variants(cost_price_slsh)')
      .eq('location_id', locationId),
    supabase
      .from('inventory_alerts')
      .select(
        'id, alert_type, created_at, product:products(name_en), variant:product_variants(sku)'
      )
      .eq('location_id', locationId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('stock_movements')
      .select(
        'id, movement_type, quantity_change, created_at, product:products(name_en), performed_by_profile:profiles!stock_movements_performed_by_fkey(full_name, phone)'
      )
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const rows = inventoryRows.data ?? []
  const totalSkus = rows.length
  const totalStockValue = rows.reduce((sum, r) => {
    const variant = r.variant as unknown as { cost_price_slsh: number } | null
    return sum + r.quantity_on_hand * (variant?.cost_price_slsh ?? 0)
  }, 0)
  const lowStockCount = rows.filter(
    (r) => r.quantity_on_hand > 0 && r.quantity_on_hand <= r.threshold
  ).length
  const outOfStockCount = rows.filter((r) => r.quantity_on_hand === 0).length

  return {
    totalSkus,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    alerts: (unresolvedAlerts.data ?? []) as unknown as {
      id: string
      alert_type: string
      created_at: string
      product: { name_en: string } | null
      variant: { sku: string } | null
    }[],
    movements: (recentMovements.data ?? []) as unknown as {
      id: string
      movement_type: string
      quantity_change: number
      created_at: string
      product: { name_en: string } | null
      performed_by_profile: { full_name: string | null; phone: string } | null
    }[],
  }
}

export default async function InventoryDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user!.id)
    .single()

  const locationId = await resolveLocationId(user!.id, profile?.role)

  if (!locationId) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <p className="text-sm text-stone-500">No location assigned to this account.</p>
      </div>
    )
  }

  const data = await getDashboardData(locationId)

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Boxes} label="Total SKUs" value={String(data.totalSkus)} />
        <KpiCard
          icon={DollarSign}
          label="Total Stock Value"
          value={formatSLSH(data.totalStockValue)}
        />
        <KpiCard icon={AlertTriangle} label="Low Stock" value={String(data.lowStockCount)} />
        <KpiCard icon={PackageX} label="Out of Stock" value={String(data.outOfStockCount)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">Unresolved Alerts</p>
          </div>
          <div className="divide-y divide-stone-100">
            {data.alerts.length === 0 && (
              <p className="p-4 text-sm text-stone-500">No unresolved alerts.</p>
            )}
            {data.alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{alert.product?.name_en}</p>
                  <p className="text-xs text-stone-500">{alert.variant?.sku}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      alert.alert_type === 'out_of_stock' ? 'stockOutOfStock' : 'stockLowStock'
                    }
                  >
                    {alert.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                  </Badge>
                  <Link
                    href="/inventory/receive"
                    className="text-xs font-medium text-orange-600 hover:underline"
                  >
                    Reorder
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">Recent Movements</p>
          </div>
          <div className="max-h-96 divide-y divide-stone-100 overflow-y-auto">
            {data.movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{m.product?.name_en}</p>
                  <p className="text-xs text-stone-500">
                    {m.performed_by_profile?.full_name || m.performed_by_profile?.phone || 'System'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={m.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {m.quantity_change >= 0 ? '+' : ''}
                    {m.quantity_change}
                  </p>
                  <p className="text-xs text-stone-400">{formatDate(m.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
