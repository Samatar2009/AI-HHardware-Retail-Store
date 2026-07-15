'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SimpleSelect } from '@/components/ui/select'
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
import { formatDate } from '@/lib/utils'
import type { Row } from '@/types/database'

type ReturnItem = Row<'return_items'>
type ReturnRow = Row<'returns'> & {
  customer: { phone: string; full_name: string | null } | null
  order: { order_number: string } | null
  return_items: ReturnItem[]
}

const REFUND_OPTIONS = [
  { value: 'original_payment', label: 'Original Payment Method' },
  { value: 'cash', label: 'Cash' },
  { value: 'store_credit', label: 'Store Credit' },
]

function ReturnPhotos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    if (paths.length === 0) return
    const supabase = createClient()
    void Promise.all(
      paths.map(async (path) => {
        const { data } = await supabase.storage.from('return-photos').createSignedUrl(path, 3600)
        return data?.signedUrl
      })
    ).then((results) => setUrls(results.filter((u): u is string => !!u)))
  }, [paths])

  if (urls.length === 0) return null

  return (
    <div className="mt-2 flex gap-2">
      {urls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt="Return evidence"
          className="size-16 rounded-md object-cover"
        />
      ))}
    </div>
  )
}

export default function StaffReturnsPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selected, setSelected] = useState<ReturnRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [refundMethod, setRefundMethod] = useState('cash')
  const [refundAmount, setRefundAmount] = useState('')
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('')
  const [refundReference, setRefundReference] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isActing, setIsActing] = useState(false)

  useEffect(() => {
    void loadReturns()
  }, [])

  async function loadReturns() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/staff/returns')
      if (res.ok) {
        const data = (await res.json()) as { returns: ReturnRow[] }
        setReturns(data.returns)
      }
    } finally {
      setIsLoading(false)
    }
  }

  function openDetail(row: ReturnRow) {
    setSelected(row)
    setShowRejectForm(false)
    setRefundMethod(row.refund_method ?? 'cash')
    setRefundAmount('')
    setMobileMoneyPhone(row.mobile_money_phone ?? '')
    setRefundReference('')
    setRejectionReason('')
    setDetailOpen(true)
  }

  async function approve() {
    if (!selected || !refundAmount) return
    setIsActing(true)
    try {
      const res = await fetch(`/api/returns/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approve: true,
          refundMethod,
          refundAmountSlsh: Number(refundAmount),
          mobileMoneyPhone: mobileMoneyPhone || undefined,
          refundReference: refundReference || undefined,
        }),
      })
      if (!res.ok) {
        showErrorToast('Could not approve return')
        return
      }
      showSuccessToast('Return approved — items restocked')
      setDetailOpen(false)
      void loadReturns()
    } finally {
      setIsActing(false)
    }
  }

  async function reject() {
    if (!selected || rejectionReason.trim().length < 3) return
    setIsActing(true)
    try {
      const res = await fetch(`/api/returns/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject: true, rejectionReason }),
      })
      if (!res.ok) {
        showErrorToast('Could not reject return')
        return
      }
      showSuccessToast('Return rejected')
      setDetailOpen(false)
      void loadReturns()
    } finally {
      setIsActing(false)
    }
  }

  const columns: DataTableColumn<ReturnRow>[] = [
    { key: 'order', header: 'Order', render: (row) => row.order?.order_number ?? '—' },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => row.customer?.full_name || row.customer?.phone || '—',
    },
    { key: 'items', header: 'Items', render: (row) => row.return_items.length },
    { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.created_at) },
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
      <PageHeader title="Returns" subtitle={`${returns.length} pending`} />

      <DataTable
        columns={columns}
        data={returns}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No pending returns"
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Return — {selected?.order?.order_number}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            {selected && (
              <>
                <p className="text-sm text-stone-600">
                  {selected.customer?.full_name || selected.customer?.phone}
                </p>

                <div className="flex flex-col gap-3">
                  {selected.return_items.map((item) => (
                    <div key={item.id} className="rounded-md border border-stone-200 p-3">
                      <p className="text-sm font-medium text-stone-900">Qty: {item.quantity}</p>
                      <p className="text-sm text-stone-600">{item.reason}</p>
                      <ReturnPhotos paths={item.photo_urls} />
                    </div>
                  ))}
                </div>

                {!showRejectForm ? (
                  <div className="flex flex-col gap-3 border-t border-stone-200 pt-4">
                    <SimpleSelect
                      label="Refund Method"
                      value={refundMethod}
                      onValueChange={setRefundMethod}
                      options={REFUND_OPTIONS}
                    />
                    <Input
                      label="Refund Amount (SLSH)"
                      type="number"
                      required
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                    {refundMethod === 'original_payment' && (
                      <Input
                        label="Mobile Money Phone"
                        value={mobileMoneyPhone}
                        onChange={(e) => setMobileMoneyPhone(e.target.value)}
                      />
                    )}
                    <Input
                      label="Refund Reference (once sent)"
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                      helperText="Mobile money refunds are processed manually — record the reference once you've sent it."
                    />
                  </div>
                ) : (
                  <div className="border-t border-stone-200 pt-4">
                    <Textarea
                      label="Rejection Reason"
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </DialogBody>
          <DialogFooter>
            {!showRejectForm ? (
              <>
                <Button variant="secondary" onClick={() => setShowRejectForm(true)}>
                  Reject
                </Button>
                <Button onClick={() => void approve()} loading={isActing} disabled={!refundAmount}>
                  Approve
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setShowRejectForm(false)}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void reject()}
                  loading={isActing}
                  disabled={rejectionReason.trim().length < 3}
                >
                  Confirm Rejection
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
