'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'
import { ORDER_STATUS_BADGE } from '@/lib/order-status'
import { formatSLSH, formatDate } from '@/lib/utils'
import type { Row } from '@/types/database'

type OrderItem = Row<'order_items'>
type Order = Row<'orders'> & {
  customer: { phone: string; full_name: string | null } | null
  order_items: OrderItem[]
}

export default function StaffPickupPage() {
  const [awaitingPrep, setAwaitingPrep] = useState<Order[]>([])
  const [readyForPickup, setReadyForPickup] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const [pickupCode, setPickupCode] = useState('')
  const [verifiedOrder, setVerifiedOrder] = useState<Order | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const [walkInQuery, setWalkInQuery] = useState('')
  const [walkInResults, setWalkInResults] = useState<Order[]>([])

  useEffect(() => {
    void loadOrders()
  }, [])

  async function loadOrders() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/staff/pickup')
      if (res.ok) {
        const data = (await res.json()) as { awaitingPrep: Order[]; readyForPickup: Order[] }
        setAwaitingPrep(data.awaitingPrep)
        setReadyForPickup(data.readyForPickup)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function markReady(orderId: string) {
    setActingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ready`, { method: 'PATCH' })
      if (!res.ok) {
        showErrorToast('Could not mark order ready')
        return
      }
      showSuccessToast('Order marked ready — customer notified by SMS')
      void loadOrders()
    } finally {
      setActingId(null)
    }
  }

  async function verifyPickupCode() {
    if (!pickupCode) return
    setIsVerifying(true)
    setVerifiedOrder(null)
    try {
      const res = await fetch('/api/pos/pickup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupCode }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Order not found')
        return
      }
      const data = (await res.json()) as { order: Order }
      setVerifiedOrder(data.order)
    } finally {
      setIsVerifying(false)
    }
  }

  async function runWalkInSearch(q: string) {
    setWalkInQuery(q)
    if (q.trim().length < 2) {
      setWalkInResults([])
      return
    }
    const res = await fetch(`/api/staff/pickup/search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = (await res.json()) as { orders: Order[] }
      setWalkInResults(data.orders)
    }
  }

  async function confirmHandover(order: Order) {
    setActingId(order.id)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/complete`, { method: 'PATCH' })
      if (!res.ok) {
        showErrorToast('Could not confirm pickup')
        return
      }
      showSuccessToast('Pickup confirmed')
      setVerifiedOrder(null)
      setPickupCode('')
      setWalkInResults([])
      setWalkInQuery('')
      void loadOrders()
    } finally {
      setActingId(null)
    }
  }

  function renderOrderDetail(order: Order) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-stone-200 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-stone-900">{order.order_number}</p>
          <Badge
            variant={ORDER_STATUS_BADGE[order.status as keyof typeof ORDER_STATUS_BADGE].variant}
          >
            {ORDER_STATUS_BADGE[order.status as keyof typeof ORDER_STATUS_BADGE].label}
          </Badge>
        </div>
        <p className="text-sm text-stone-500">
          {order.customer?.full_name || order.customer?.phone}
        </p>
        <div className="divide-y divide-stone-100">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between py-1 text-sm">
              <span>
                {item.quantity}x {item.product_name_en}
              </span>
              <span>{formatSLSH(item.total_price_slsh)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold">
          <span>Total</span>
          <span>{formatSLSH(order.total_slsh)}</span>
        </div>
        {order.status === 'ready_for_pickup' && (
          <Button onClick={() => void confirmHandover(order)} loading={actingId === order.id}>
            Confirm Handover
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pickup" />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Verify Pickup Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="6-character pickup code"
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                className="text-lg uppercase tracking-widest"
              />
              <Button onClick={() => void verifyPickupCode()} loading={isVerifying}>
                Lookup
              </Button>
            </div>
            {verifiedOrder && <div className="mt-4">{renderOrderDetail(verifiedOrder)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Walk-in Pickup (lost code)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Order number or phone"
              value={walkInQuery}
              onChange={(e) => void runWalkInSearch(e.target.value)}
            />
            <div className="mt-3 flex flex-col gap-3">
              {walkInResults.map((order) => (
                <div key={order.id}>{renderOrderDetail(order)}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting Preparation ({awaitingPrep.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-stone-500">Loading...</p>
          ) : awaitingPrep.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing awaiting preparation.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {awaitingPrep.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-md border border-stone-200 p-3"
                >
                  <div>
                    <p className="font-medium text-stone-900">{order.order_number}</p>
                    <p className="text-xs text-stone-500">
                      {order.customer?.full_name || order.customer?.phone} ·{' '}
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void markReady(order.id)}
                    loading={actingId === order.id}
                  >
                    Mark Ready
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ready for Pickup ({readyForPickup.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {readyForPickup.length === 0 ? (
            <p className="text-sm text-stone-500">No orders ready for pickup.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {readyForPickup.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-md border border-stone-200 p-3"
                >
                  <div>
                    <p className="font-medium text-stone-900">{order.order_number}</p>
                    <p className="text-xs text-stone-500">
                      {order.customer?.full_name || order.customer?.phone} · Pickup code{' '}
                      {order.pickup_code} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void confirmHandover(order)}
                    loading={actingId === order.id}
                  >
                    Confirm Handover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
