'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SimpleSelect } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { Spinner } from '@/components/ui/spinner'
import { ORDER_STATUS_BADGE } from '@/lib/order-status'
import { formatSLSH, formatDate } from '@/lib/utils'
import type { OrderStatus, PaymentMethod } from '@/types/order'

interface AdminOrderRow {
  id: string
  order_number: string
  status: OrderStatus
  payment_method: PaymentMethod
  total_slsh: number
  created_at: string
  customer: { phone: string; full_name: string | null } | null
  location: { name_en: string } | null
}

interface OrderItemRow {
  id: string
  product_name_en: string
  sku: string
  quantity: number
  unit_price_slsh: number
  total_price_slsh: number
}

interface OrderDetail extends AdminOrderRow {
  pickup_code: string | null
  payment_reference: string | null
  payment_status: string
  order_items: OrderItemRow[]
}

interface LocationOption {
  id: string
  name_en: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'payment_submitted', label: 'Payment Submitted' },
  { value: 'payment_confirmed', label: 'Payment Confirmed' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [isActing, setIsActing] = useState(false)

  useEffect(() => {
    void loadOrders()
    void fetch('/api/locations')
      .then((res) => res.json())
      .then((data: { locations: LocationOption[] }) => setLocations(data.locations))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, locationFilter, fromDate, toDate])

  async function loadOrders() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (locationFilter !== 'all') params.set('location_id', locationFilter)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)

      const res = await fetch(`/api/admin/orders?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as { orders: AdminOrderRow[] }
        setOrders(data.orders)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function openDetail(id: string) {
    const res = await fetch(`/api/admin/orders/${id}`)
    if (res.ok) {
      const data = (await res.json()) as { order: OrderDetail }
      setSelectedOrder(data.order)
      setDetailOpen(true)
    }
  }

  async function performAction(action: 'confirm-payment' | 'ready' | 'complete') {
    if (!selectedOrder) return
    setIsActing(true)
    try {
      const body =
        action === 'confirm-payment'
          ? { transactionReference: selectedOrder.payment_reference ?? 'manual-verify' }
          : undefined
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Action failed')
        return
      }
      showSuccessToast('Order updated')
      setDetailOpen(false)
      void loadOrders()
    } finally {
      setIsActing(false)
    }
  }

  function exportCsv() {
    const params = new URLSearchParams()
    if (locationFilter !== 'all') params.set('location_id', locationFilter)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    window.open(`/api/admin/analytics/export?${params.toString()}`, '_blank')
  }

  const locationOptions = useMemo(
    () => [
      { value: 'all', label: 'All locations' },
      ...locations.map((l) => ({ value: l.id, label: l.name_en })),
    ],
    [locations]
  )

  const columns: DataTableColumn<AdminOrderRow>[] = [
    {
      key: 'order_number',
      header: 'Order #',
      sortable: true,
      sortValue: (row) => row.order_number,
      render: (row) => (
        <button
          className="font-medium text-orange-600 hover:underline"
          onClick={() => void openDetail(row.id)}
        >
          {row.order_number}
        </button>
      ),
    },
    { key: 'customer', header: 'Customer', render: (row) => row.customer?.phone ?? '—' },
    { key: 'location', header: 'Location', render: (row) => row.location?.name_en ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const badge = ORDER_STATUS_BADGE[row.status]
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    { key: 'payment_method', header: 'Payment', render: (row) => row.payment_method },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      sortValue: (row) => row.total_slsh,
      render: (row) => formatSLSH(row.total_slsh),
    },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.created_at) },
  ]

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} orders`}
        cta={
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-4 gap-4">
        <SimpleSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={STATUS_OPTIONS}
        />
        <SimpleSelect
          value={locationFilter}
          onValueChange={setLocationFilter}
          options={locationOptions}
        />
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        data={orders}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No orders found"
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            {!selectedOrder ? (
              <div className="flex justify-center py-10">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant={ORDER_STATUS_BADGE[selectedOrder.status].variant}>
                    {ORDER_STATUS_BADGE[selectedOrder.status].label}
                  </Badge>
                  <span className="text-sm text-stone-500">
                    {formatDate(selectedOrder.created_at)}
                  </span>
                </div>
                <p className="text-sm text-stone-700">
                  Customer: {selectedOrder.customer?.full_name || selectedOrder.customer?.phone} ·
                  Location: {selectedOrder.location?.name_en}
                </p>
                {selectedOrder.pickup_code && (
                  <p className="text-sm text-stone-700">
                    Pickup code: <strong>{selectedOrder.pickup_code}</strong>
                  </p>
                )}
                <div className="rounded-md border border-stone-200">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                      <tr>
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-left">SKU</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {selectedOrder.order_items.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2">{item.product_name_en}</td>
                          <td className="p-2">{item.sku}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{formatSLSH(item.total_price_slsh)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-right text-sm font-semibold text-stone-900">
                  Total: {formatSLSH(selectedOrder.total_slsh)}
                </p>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            {selectedOrder?.status === 'payment_submitted' ||
            selectedOrder?.status === 'pending_payment' ? (
              <Button onClick={() => void performAction('confirm-payment')} loading={isActing}>
                Confirm Payment
              </Button>
            ) : null}
            {selectedOrder?.status === 'payment_confirmed' ? (
              <Button onClick={() => void performAction('ready')} loading={isActing}>
                Mark Ready for Pickup
              </Button>
            ) : null}
            {selectedOrder?.status === 'ready_for_pickup' ? (
              <Button onClick={() => void performAction('complete')} loading={isActing}>
                Mark Completed
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
