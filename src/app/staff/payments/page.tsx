'use client'

import { useEffect, useRef, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatSLSH, formatDate } from '@/lib/utils'
import type { Row } from '@/types/database'

type Order = Row<'orders'> & { customer: { phone: string; full_name: string | null } | null }

function playNotificationBeep() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.2)
  } catch {
    // Audio isn't critical to the flow — ignore if the browser blocks it.
  }
}

export default function StaffPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [locationId, setLocationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [selected, setSelected] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [issueNote, setIssueNote] = useState('')
  const [confirmRef, setConfirmRef] = useState('')
  const [isActing, setIsActing] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)

  const knownIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    void loadOrders()
  }, [])

  useEffect(() => {
    if (!locationId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`staff-payments-${locationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `location_id=eq.${locationId}` },
        (payload) => {
          const updated = payload.new as Order
          if (updated.status === 'payment_submitted') {
            if (!knownIds.current.has(updated.id)) {
              playNotificationBeep()
              showSuccessToast(`New payment submitted: ${updated.order_number}`)
            }
            void loadOrders()
          } else if (knownIds.current.has(updated.id)) {
            // Left the pending state (confirmed, failed, etc.) — refresh to drop it from the list.
            void loadOrders()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [locationId])

  async function loadOrders() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/staff/payments')
      if (res.ok) {
        const data = (await res.json()) as { orders: Order[]; locationId: string }
        setOrders(data.orders)
        setLocationId(data.locationId)
        knownIds.current = new Set(data.orders.map((o) => o.id))
      }
    } finally {
      setIsLoading(false)
    }
  }

  function openDetail(order: Order) {
    setSelected(order)
    setConfirmRef(order.payment_reference ?? '')
    setIssueNote('')
    setShowReportForm(false)
    setDetailOpen(true)
  }

  async function confirmPayment() {
    if (!selected) return
    setIsActing(true)
    try {
      const res = await fetch(`/api/admin/orders/${selected.id}/confirm-payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionReference: confirmRef || 'staff-verified' }),
      })
      if (!res.ok) {
        showErrorToast('Could not confirm payment')
        return
      }
      showSuccessToast('Payment confirmed — customer notified by SMS')
      setDetailOpen(false)
      void loadOrders()
    } finally {
      setIsActing(false)
    }
  }

  async function reportIssue() {
    if (!selected || issueNote.trim().length < 3) return
    setIsActing(true)
    try {
      const res = await fetch(`/api/admin/orders/${selected.id}/report-issue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: issueNote }),
      })
      if (!res.ok) {
        showErrorToast('Could not report issue')
        return
      }
      showSuccessToast('Issue reported')
      setDetailOpen(false)
      void loadOrders()
    } finally {
      setIsActing(false)
    }
  }

  const columns: DataTableColumn<Order>[] = [
    { key: 'order_number', header: 'Order #', render: (row) => row.order_number },
    { key: 'customer', header: 'Customer Phone', render: (row) => row.customer?.phone ?? '—' },
    { key: 'method', header: 'Method', render: (row) => row.payment_method },
    { key: 'amount', header: 'Amount', render: (row) => formatSLSH(row.total_slsh) },
    { key: 'reference', header: 'Reference', render: (row) => row.payment_reference ?? '—' },
    { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.updated_at) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button size="sm" onClick={() => openDetail(row)}>
          Review
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Payment Confirmation" subtitle={`${orders.length} pending`} />

      <DataTable
        columns={columns}
        data={orders}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No pending payments"
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{selected?.order_number}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            {selected && (
              <>
                <p className="text-sm text-stone-600">
                  {selected.customer?.full_name || selected.customer?.phone} ·{' '}
                  {selected.payment_method} · {formatSLSH(selected.total_slsh)}
                </p>
                <p className="text-sm text-stone-500">
                  Customer-submitted reference: {selected.payment_reference || 'not provided'}
                </p>
                <p className="text-xs text-stone-400">
                  Verify this transaction in your mobile money app before confirming.
                </p>

                {!showReportForm ? (
                  <Input
                    label="Verified Transaction Reference"
                    value={confirmRef}
                    onChange={(e) => setConfirmRef(e.target.value)}
                  />
                ) : (
                  <Textarea
                    label="Issue Note"
                    required
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                  />
                )}
              </>
            )}
          </DialogBody>
          <DialogFooter>
            {!showReportForm ? (
              <>
                <Button variant="secondary" onClick={() => setShowReportForm(true)}>
                  Report Issue
                </Button>
                <Button onClick={() => void confirmPayment()} loading={isActing}>
                  Confirm Payment
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setShowReportForm(false)}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void reportIssue()}
                  loading={isActing}
                  disabled={issueNote.trim().length < 3}
                >
                  Submit Issue
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
