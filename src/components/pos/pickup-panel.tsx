'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'
import { formatSLSH, formatDate } from '@/lib/utils'

interface OrderItem {
  id: string
  product_name_en: string
  sku: string
  quantity: number
  total_price_slsh: number
}

interface PickupOrder {
  id: string
  order_number: string
  total_slsh: number
  pickup_code: string
  created_at: string
  customer: { phone: string; full_name: string | null } | null
  order_items: OrderItem[]
}

function printPickupReceipt(order: PickupOrder) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 150] })
  doc.setFontSize(12)
  doc.text('Borama Hardware', 40, 8, { align: 'center' })
  doc.setFontSize(9)
  doc.text('Pickup Confirmation', 40, 14, { align: 'center' })
  doc.setFontSize(8)
  doc.text(`Order: ${order.order_number}`, 5, 22)
  doc.text(`Date: ${new Date().toLocaleString()}`, 5, 27)
  doc.text(`Customer: ${order.customer?.full_name || order.customer?.phone || ''}`, 5, 32)

  let y = 40
  for (const item of order.order_items) {
    doc.text(`${item.quantity}x ${item.product_name_en}`, 5, y)
    doc.text(formatSLSH(item.total_price_slsh), 75, y, { align: 'right' })
    y += 5
  }
  y += 3
  doc.setFontSize(10)
  doc.text('Total:', 5, y)
  doc.text(formatSLSH(order.total_slsh), 75, y, { align: 'right' })

  doc.save(`pickup-${order.order_number}.pdf`)
}

function PickupPanel() {
  const [pickupCode, setPickupCode] = useState('')
  const [order, setOrder] = useState<PickupOrder | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const [orderRef, setOrderRef] = useState('')
  const [paymentOrderId, setPaymentOrderId] = useState('')
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)

  async function lookupOrder() {
    if (!pickupCode) return
    setIsLookingUp(true)
    setOrder(null)
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
      const data = (await res.json()) as { order: PickupOrder }
      setOrder(data.order)
    } finally {
      setIsLookingUp(false)
    }
  }

  async function confirmHandover() {
    if (!order) return
    setIsConfirming(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/complete`, { method: 'PATCH' })
      if (!res.ok) {
        showErrorToast('Could not confirm pickup')
        return
      }
      showSuccessToast('Pickup confirmed')
      printPickupReceipt(order)
      setOrder(null)
      setPickupCode('')
    } finally {
      setIsConfirming(false)
    }
  }

  async function confirmPayment() {
    if (!paymentOrderId || !orderRef) return
    setIsConfirmingPayment(true)
    try {
      const res = await fetch('/api/pos/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: paymentOrderId, transactionReference: orderRef }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not confirm payment')
        return
      }
      showSuccessToast('Payment confirmed — customer notified by SMS')
      setPaymentOrderId('')
      setOrderRef('')
    } finally {
      setIsConfirmingPayment(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
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
            <Button onClick={() => void lookupOrder()} loading={isLookingUp}>
              Lookup
            </Button>
          </div>

          {order && (
            <div className="mt-4 flex flex-col gap-3 rounded-md border border-stone-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-stone-900">{order.order_number}</p>
                <Badge variant="orderReadyForPickup">Ready for Pickup</Badge>
              </div>
              <p className="text-sm text-stone-500">
                {order.customer?.full_name || order.customer?.phone} ·{' '}
                {formatDate(order.created_at)}
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
              <Button onClick={() => void confirmHandover()} loading={isConfirming}>
                Confirm Handover
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirm Mobile Money Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Input
              label="Order ID"
              value={paymentOrderId}
              onChange={(e) => setPaymentOrderId(e.target.value)}
            />
            <Input
              label="Transaction Reference"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
            />
            <Button
              onClick={() => void confirmPayment()}
              loading={isConfirmingPayment}
              disabled={!paymentOrderId || !orderRef}
            >
              Confirm Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { PickupPanel }
