'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'

import { formatDate, formatSLSH } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { ORDER_STATUS_BADGE } from '@/lib/order-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SimpleSelect } from '@/components/ui/select'
import type { OrderStatus } from '@/types/order'

const PAGE_SIZE = 10

interface OrderListItem {
  id: string
  order_number: string
  created_at: string
  status: OrderStatus
  total_slsh: number
  location: { name_en: string } | null
  order_items: { product_name_en: string }[]
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_payment', label: 'Pending Verification' },
  { value: 'payment_confirmed', label: 'Confirmed' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function OrdersPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', user?.id, statusFilter, visibleCount],
    enabled: !!user,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('orders')
        .select('id, order_number, created_at, status, total_slsh, location:locations(name_en), order_items(product_name_en)')
        .order('created_at', { ascending: false })
        .limit(visibleCount)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data: orders } = await query
      return (orders ?? []) as unknown as OrderListItem[]
    },
  })

  const orders = data ?? []

  if (!isLoading && orders.length === 0) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState icon={Package} title="No orders yet" ctaLabel="Start Shopping" onCtaClick={() => (window.location.href = '/')} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold leading-[38px] text-stone-900">Orders</h1>
        <SimpleSelect value={statusFilter} onValueChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
      </div>

      <div className="flex flex-col gap-4">
        {orders.map((order) => {
          const badge = ORDER_STATUS_BADGE[order.status]
          const itemNames = order.order_items.slice(0, 3).map((i) => i.product_name_en)
          const extraCount = order.order_items.length - itemNames.length

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-4 transition-colors duration-100 hover:border-orange-300 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-stone-900">{order.order_number}</p>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">{formatDate(order.created_at)}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {itemNames.join(', ')}
                  {extraCount > 0 && ` +${extraCount} more`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-stone-900">{formatSLSH(order.total_slsh)}</p>
                {order.location && <p className="text-xs text-stone-500">{order.location.name_en}</p>}
              </div>
            </Link>
          )
        })}
      </div>

      {orders.length >= visibleCount && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
