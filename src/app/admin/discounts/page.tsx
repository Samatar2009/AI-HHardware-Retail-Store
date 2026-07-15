'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface DiscountRow {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  value: number
  minimum_order_slsh: number
  max_total_uses: number | null
  uses_count: number
  valid_from: string
  valid_until: string
  is_active: boolean
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState('percentage')
  const [value, setValue] = useState('')
  const [minimumOrder, setMinimumOrder] = useState('0')
  const [maxTotalUses, setMaxTotalUses] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')

  useEffect(() => {
    void loadDiscounts()
  }, [])

  async function loadDiscounts() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/discounts')
      if (res.ok) {
        const data = (await res.json()) as { discounts: DiscountRow[] }
        setDiscounts(data.discounts)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleActive(row: DiscountRow) {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === row.id ? { ...d, is_active: !d.is_active } : d))
    )
    await fetch(`/api/admin/discounts/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !row.is_active }),
    })
  }

  async function createDiscount() {
    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        discountType,
        value: Number(value),
        minimumOrderSlsh: Number(minimumOrder) || 0,
        maxTotalUses: maxTotalUses ? Number(maxTotalUses) : null,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      showErrorToast(data.error ?? 'Could not create discount code')
      return
    }
    showSuccessToast('Discount code created')
    setDialogOpen(false)
    setCode('')
    setValue('')
    setMinimumOrder('0')
    setMaxTotalUses('')
    setValidFrom('')
    setValidUntil('')
    void loadDiscounts()
  }

  const columns: DataTableColumn<DiscountRow>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (row) => <span className="font-mono font-semibold">{row.code}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (row.discount_type === 'percentage' ? `${row.value}%` : `${row.value} SLSH`),
    },
    { key: 'min_order', header: 'Min Order', render: (row) => `${row.minimum_order_slsh} SLSH` },
    {
      key: 'uses',
      header: 'Uses',
      render: (row) => `${row.uses_count}${row.max_total_uses ? ` / ${row.max_total_uses}` : ''}`,
    },
    { key: 'valid', header: 'Valid Until', render: (row) => formatDate(row.valid_until) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.is_active} onCheckedChange={() => void toggleActive(row)} />
          <Badge variant={row.is_active ? 'stockInStock' : 'orderCancelled'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Discount Codes"
        subtitle={`${discounts.length} codes`}
        cta={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> New Discount Code
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={discounts}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No discount codes yet"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New Discount Code</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Input
              label="Code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <SimpleSelect
              label="Type"
              value={discountType}
              onValueChange={setDiscountType}
              options={[
                { value: 'percentage', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed Amount (SLSH)' },
              ]}
            />
            <Input
              label="Value"
              type="number"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Input
              label="Minimum Order (SLSH)"
              type="number"
              value={minimumOrder}
              onChange={(e) => setMinimumOrder(e.target.value)}
            />
            <Input
              label="Max Total Uses"
              type="number"
              value={maxTotalUses}
              onChange={(e) => setMaxTotalUses(e.target.value)}
              helperText="Leave blank for unlimited"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valid From"
                type="date"
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
              <Input
                label="Valid Until"
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void createDiscount()}
              disabled={!code || !value || !validFrom || !validUntil}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
