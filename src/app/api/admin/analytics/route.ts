import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

export const revalidate = 300

interface OrderRow {
  total_slsh: number
  payment_method: string
  location_id: string
  location: { name_en: string } | null
}

interface OrderItemRow {
  product_name_en: string
  quantity: number
  total_price_slsh: number
}

export async function GET(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? new Date(Date.now() - 6 * 86400000).toISOString()
  const to = searchParams.get('to') ?? new Date().toISOString()
  const locationId = searchParams.get('location_id')

  const supabase = await createClient()

  let ordersQuery = supabase
    .from('orders')
    .select('id, total_slsh, payment_method, location_id, location:locations(name_en)')
    .gte('created_at', from)
    .lte('created_at', to)
    .neq('status', 'cancelled')

  if (locationId) ordersQuery = ordersQuery.eq('location_id', locationId)

  const { data: orders, error: ordersError } = await ordersQuery
  if (ordersError) {
    return NextResponse.json({ error: 'Could not load analytics' }, { status: 500 })
  }

  const orderRows = (orders ?? []) as unknown as OrderRow[]
  const orderIds = (orders ?? []).map((o) => (o as unknown as { id: string }).id)

  const { data: items } = orderIds.length
    ? await supabase
        .from('order_items')
        .select('product_name_en, quantity, total_price_slsh')
        .in('order_id', orderIds)
    : { data: [] as OrderItemRow[] }

  const totalRevenue = orderRows.reduce((sum, o) => sum + o.total_slsh, 0)
  const orderCount = orderRows.length
  const averageOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0

  const revenueByLocation = new Map<string, { name: string; revenue: number; orders: number }>()
  for (const order of orderRows) {
    const key = order.location_id
    const entry = revenueByLocation.get(key) ?? {
      name: order.location?.name_en ?? 'Unknown',
      revenue: 0,
      orders: 0,
    }
    entry.revenue += order.total_slsh
    entry.orders += 1
    revenueByLocation.set(key, entry)
  }

  const revenueByPaymentMethod = new Map<string, { revenue: number; orders: number }>()
  for (const order of orderRows) {
    const entry = revenueByPaymentMethod.get(order.payment_method) ?? { revenue: 0, orders: 0 }
    entry.revenue += order.total_slsh
    entry.orders += 1
    revenueByPaymentMethod.set(order.payment_method, entry)
  }

  const productRevenue = new Map<string, { quantity: number; revenue: number }>()
  for (const item of (items ?? []) as OrderItemRow[]) {
    const entry = productRevenue.get(item.product_name_en) ?? { quantity: 0, revenue: 0 }
    entry.quantity += item.quantity
    entry.revenue += item.total_price_slsh
    productRevenue.set(item.product_name_en, entry)
  }

  const topProducts = [...productRevenue.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return NextResponse.json({
    totalRevenue,
    orderCount,
    averageOrderValue,
    topProduct: topProducts[0]?.name ?? null,
    topProducts,
    revenueByLocation: [...revenueByLocation.values()],
    revenueByPaymentMethod: [...revenueByPaymentMethod.entries()].map(([method, v]) => ({
      method,
      ...v,
    })),
  })
}
