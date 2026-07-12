'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'
import { formatSLSH } from '@/lib/utils'
import { generateReceiptPdf } from '@/lib/receipt'
import { queueOfflineTransaction } from '@/lib/offline-queue'
import { useAuthStore } from '@/stores/auth.store'
import type { PosSession, PosPaymentMethod } from '@/types/pos'
import type { PosCartItem } from '@/app/pos/page'

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: PosSession
  cart: PosCartItem[]
  customer: { userId: string; fullName: string | null; phone: string } | null
  discountCode: string
  discountAmountSlsh: number
  subtotal: number
  total: number
  onComplete: (transaction: { id: string; transactionNumber: string } | null) => void
}

interface PaymentLine {
  key: string
  method: PosPaymentMethod
  amountSlsh: number
  reference: string
}

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'zaad', label: 'Zaad' },
  { value: 'edahab', label: 'eDahab' },
  { value: 'evc_plus', label: 'EVC Plus' },
  { value: 'sahal', label: 'Sahal' },
]

function PaymentModal({
  open,
  onOpenChange,
  session,
  cart,
  customer,
  discountCode,
  discountAmountSlsh,
  subtotal,
  total,
  onComplete,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<PaymentLine[]>([{ key: crypto.randomUUID(), method: 'cash', amountSlsh: total, reference: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const cashierProfile = useAuthStore((s) => s.profile)

  const paidSoFar = payments.reduce((sum, p) => sum + p.amountSlsh, 0)
  const remaining = total - paidSoFar
  const tenderedCash = payments.find((p) => p.method === 'cash')?.amountSlsh ?? 0
  const changeDue = payments.length === 1 && payments[0].method === 'cash' ? Math.max(0, tenderedCash - total) : 0

  function updatePayment(key: string, updates: Partial<PaymentLine>) {
    setPayments((prev) => prev.map((p) => (p.key === key ? { ...p, ...updates } : p)))
  }

  function addSplit() {
    setPayments((prev) => [...prev, { key: crypto.randomUUID(), method: 'cash', amountSlsh: Math.max(0, remaining), reference: '' }])
  }

  function removeSplit(key: string) {
    setPayments((prev) => prev.filter((p) => p.key !== key))
  }

  async function handleCharge() {
    const effectiveTendered = payments.length === 1 ? Math.max(payments[0].amountSlsh, total) : paidSoFar
    if (effectiveTendered < total) {
      showErrorToast('Payment does not cover the total')
      return
    }

    const transactionPayload = {
      posSessionId: session.id,
      locationId: session.location_id,
      customerId: customer?.userId,
      customerPhone: customer?.phone,
      items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      discountCode: discountCode || undefined,
      payments: payments.map((p, i) => ({
        method: p.method,
        amountSlsh: p.method === 'cash' && payments.length === 1 ? Math.max(p.amountSlsh, total) : p.amountSlsh,
        changeSlsh: p.method === 'cash' && payments.length === 1 && i === 0 ? changeDue : 0,
        transactionReference: p.reference || undefined,
      })),
    }

    if (!navigator.onLine) {
      setIsSubmitting(true)
      try {
        await queueOfflineTransaction(transactionPayload)
        showSuccessToast('OFFLINE — sale queued and will sync automatically once back online')
        setPayments([{ key: crypto.randomUUID(), method: 'cash', amountSlsh: total, reference: '' }])
        onOpenChange(false)
        onComplete(null)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionPayload),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not complete sale')
        return
      }

      const data = (await res.json()) as {
        transaction: {
          id: string
          transaction_number: string
          created_at: string
          loyalty_points_earned: number
          pos_transaction_items: { product_name_en: string; sku: string; quantity: number; unit_price_slsh: number; total_price_slsh: number }[]
          pos_payment_splits: { payment_method: string; amount_slsh: number; change_slsh: number }[]
        }
      }

      const doc = await generateReceiptPdf({
        transactionNumber: data.transaction.transaction_number,
        locationName: 'Borama Hardware',
        cashierName: cashierProfile?.full_name || cashierProfile?.phone || 'Cashier',
        createdAt: data.transaction.created_at,
        items: data.transaction.pos_transaction_items.map((item) => ({
          productNameEn: item.product_name_en,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceSlsh: item.unit_price_slsh,
          totalPriceSlsh: item.total_price_slsh,
        })),
        subtotalSlsh: subtotal,
        discountAmountSlsh,
        totalSlsh: total,
        payments: data.transaction.pos_payment_splits.map((p) => ({
          method: p.payment_method,
          amountSlsh: p.amount_slsh,
          changeSlsh: p.change_slsh,
        })),
        loyaltyPointsEarned: data.transaction.loyalty_points_earned,
      })
      doc.save(`receipt-${data.transaction.transaction_number}.pdf`)

      showSuccessToast('Sale complete')
      setPayments([{ key: crypto.randomUUID(), method: 'cash', amountSlsh: total, reference: '' }])
      onComplete({ id: data.transaction.id, transactionNumber: data.transaction.transaction_number })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Charge {formatSLSH(total)}</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {payments.map((p) => (
            <div key={p.key} className="flex items-end gap-2">
              <div className="w-40">
                <SimpleSelect
                  label="Method"
                  value={p.method}
                  onValueChange={(v) => updatePayment(p.key, { method: v as PosPaymentMethod })}
                  options={METHOD_OPTIONS}
                />
              </div>
              <Input
                label={p.method === 'cash' ? 'Amount Tendered' : 'Amount'}
                type="number"
                value={p.amountSlsh}
                onChange={(e) => updatePayment(p.key, { amountSlsh: Number(e.target.value) || 0 })}
              />
              {p.method !== 'cash' && (
                <Input
                  label="Reference"
                  value={p.reference}
                  onChange={(e) => updatePayment(p.key, { reference: e.target.value })}
                />
              )}
              {payments.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeSplit(p.key)} aria-label="Remove payment">
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}

          <Button variant="secondary" size="sm" onClick={addSplit} className="self-start">
            <Plus className="size-3.5" /> Split Payment
          </Button>

          <div className="rounded-md border border-stone-200 p-3 text-sm">
            <div className="flex justify-between">
              <span>Total Due</span>
              <span className="font-semibold">{formatSLSH(total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{formatSLSH(paidSoFar)}</span>
            </div>
            {changeDue > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Change Due</span>
                <span>{formatSLSH(changeDue)}</span>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleCharge()} loading={isSubmitting}>
            Complete Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { PaymentModal }
