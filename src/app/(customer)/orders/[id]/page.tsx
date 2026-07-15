'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'

import { formatDate, formatSLSH } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useOrderRealtime } from '@/hooks/use-order-realtime'
import { useCartStore } from '@/stores/cart.store'
import { ORDER_STATUS_BADGE } from '@/lib/order-status'
import { OrderStatusStepper } from '@/components/order-status-stepper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SimpleSelect } from '@/components/ui/select'
import { showSuccessToast } from '@/components/ui/toast'
import type { Row } from '@/types/database'
import type { OrderStatus } from '@/types/order'

type Order = Row<'orders'>
type OrderItem = Row<'order_items'>

const CANCEL_REASONS = [
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'found_elsewhere', label: 'Found elsewhere' },
  { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
  { value: 'other', label: 'Other' },
]

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const [order, setOrder] = useState<Order | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('changed_mind')
  const [isCancelling, setIsCancelling] = useState(false)

  const { data } = useQuery({
    queryKey: ['order-detail', params.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, location:locations(name_en), items:order_items(*)')
        .eq('id', params.id)
        .single()
      return orderData as
        | (Order & { location: { name_en: string } | null; items: OrderItem[] })
        | null
    },
  })

  useEffect(() => {
    if (data) setOrder(data)
  }, [data])

  useOrderRealtime(params.id, (updated) =>
    setOrder((prev) => (prev ? { ...prev, ...updated } : (updated as Order)))
  )

  async function handleCancel() {
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/orders/${params.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      })
      if (res.ok) {
        setCancelOpen(false)
        showSuccessToast('Order cancelled')
      }
    } finally {
      setIsCancelling(false)
    }
  }

  function handleReorder() {
    if (!data) return
    for (const item of data.items) {
      addItem({
        productId: item.product_id ?? '',
        variantId: item.variant_id,
        sku: item.sku,
        nameEn: item.product_name_en,
        nameSo: item.product_name_so,
        quantity: item.quantity,
        unitPriceSlsh: item.unit_price_slsh,
        imageUrl: null,
      })
    }
    showSuccessToast('Items added to cart')
    router.push('/cart')
  }

  if (!order || !data) return null

  const badge = ORDER_STATUS_BADGE[order.status as OrderStatus]
  const showPickupCode = order.status === 'payment_confirmed' || order.status === 'ready_for_pickup'
  const canCancel = order.status === 'pending_payment'
  const canReturn =
    order.status === 'completed' &&
    order.updated_at &&
    Date.now() - new Date(order.updated_at).getTime() < SEVEN_DAYS_MS

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{order.order_number}</h1>
          <p className="text-sm text-stone-500">{formatDate(order.created_at)}</p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="mb-6">
        <OrderStatusStepper status={order.status as OrderStatus} />
      </div>

      {showPickupCode && (
        <div className="mb-6 rounded-md border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-500">Pickup Code</p>
          <p className="text-4xl font-bold tracking-widest text-orange-600">{order.pickup_code}</p>
        </div>
      )}

      <div className="mb-6 rounded-md border border-stone-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-stone-900">Items</p>
        <div className="flex flex-col gap-2">
          {data.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-stone-700">
                {item.product_name_en} × {item.quantity}
              </span>
              <span className="font-medium text-stone-900">
                {formatSLSH(item.total_price_slsh)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-base font-bold text-stone-900">
          <span>Total</span>
          <span>{formatSLSH(order.total_slsh)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {canCancel && (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            Cancel Order
          </Button>
        )}
        {canReturn && (
          <Button variant="secondary" onClick={() => router.push(`/returns/new?order=${order.id}`)}>
            Return Items
          </Button>
        )}
        <Button variant="secondary" onClick={handleReorder}>
          <RotateCcw className="size-4" />
          Reorder
        </Button>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="mb-3 text-sm text-stone-600">Are you sure? Select a reason:</p>
            <SimpleSelect
              value={cancelReason}
              onValueChange={setCancelReason}
              options={CANCEL_REASONS}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(false)}
              disabled={isCancelling}
            >
              Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancel} loading={isCancelling}>
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
