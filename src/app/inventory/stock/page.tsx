'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import { Download, Upload } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface InventoryRow {
  id: string
  quantity_on_hand: number
  quantity_reserved: number
  threshold: number
  aisle_shelf: string | null
  last_restocked_at: string | null
  product: {
    name_en: string
    sku_base: string
    category: { name_en: string } | null
    product_images: { thumbnail_url: string; sort_order: number }[]
  } | null
  variant: { sku: string; attributes: Record<string, string> } | null
}

const ALERT_STATUS_OPTIONS = [
  { value: 'all', label: 'All stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
]

export default function InventoryStockPage() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [alertFilter, setAlertFilter] = useState('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadStock()
  }, [])

  async function loadStock() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) {
        const data = (await res.json()) as { inventory: InventoryRow[] }
        setRows(data.inventory)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function updateField(
    row: InventoryRow,
    field: 'threshold' | 'aisleShelf',
    value: number | string
  ) {
    await fetch(`/api/inventory/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const row of rows)
      if (row.product?.category?.name_en) set.add(row.product.category.name_en)
    return [
      { value: 'all', label: 'All categories' },
      ...[...set].map((c) => ({ value: c, label: c })),
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (categoryFilter !== 'all' && row.product?.category?.name_en !== categoryFilter)
        return false
      if (
        alertFilter === 'low' &&
        !(row.quantity_on_hand > 0 && row.quantity_on_hand <= row.threshold)
      )
        return false
      if (alertFilter === 'out' && row.quantity_on_hand !== 0) return false
      if (search) {
        const q = search.toLowerCase()
        const matches =
          row.product?.name_en.toLowerCase().includes(q) ||
          row.product?.sku_base.toLowerCase().includes(q) ||
          row.variant?.sku.toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [rows, categoryFilter, alertFilter, search])

  function downloadTemplate() {
    const csv = Papa.unparse([{ sku: 'EXAMPLE-SKU', threshold: 10 }])
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'threshold-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCsvUpload(file: File) {
    Papa.parse<{ sku: string; threshold: string }>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let updated = 0
        for (const record of results.data) {
          const match = rows.find(
            (r) => r.variant?.sku === record.sku || r.product?.sku_base === record.sku
          )
          const threshold = Number(record.threshold)
          if (match && !Number.isNaN(threshold)) {
            await updateField(match, 'threshold', threshold)
            updated++
          }
        }
        showSuccessToast(`Updated thresholds for ${updated} item(s)`)
        void loadStock()
      },
      error: () => showErrorToast('Could not parse CSV file'),
    })
  }

  const columns: DataTableColumn<InventoryRow>[] = [
    {
      key: 'image',
      header: '',
      render: (row) => {
        const thumb = [...(row.product?.product_images ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order
        )[0]
        return thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb.thumbnail_url} alt="" className="size-10 rounded object-cover" />
        ) : (
          <div className="size-10 rounded bg-stone-100" />
        )
      },
    },
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      sortValue: (row) => row.product?.name_en ?? '',
      render: (row) => (
        <div>
          <p className="font-medium text-stone-900">{row.product?.name_en}</p>
          <p className="text-xs text-stone-500">{row.variant?.sku}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => row.product?.category?.name_en ?? '—' },
    {
      key: 'on_hand',
      header: 'On Hand',
      sortable: true,
      sortValue: (row) => row.quantity_on_hand,
      render: (row) => row.quantity_on_hand,
    },
    { key: 'reserved', header: 'Reserved', render: (row) => row.quantity_reserved },
    {
      key: 'available',
      header: 'Available',
      render: (row) => row.quantity_on_hand - row.quantity_reserved,
    },
    {
      key: 'threshold',
      header: 'Threshold',
      render: (row) => (
        <Input
          type="number"
          defaultValue={row.threshold}
          className="h-8 w-20"
          onBlur={(e) => void updateField(row, 'threshold', Number(e.target.value))}
        />
      ),
    },
    {
      key: 'aisle_shelf',
      header: 'Aisle/Shelf',
      render: (row) => (
        <Input
          defaultValue={row.aisle_shelf ?? ''}
          className="h-8 w-24"
          onBlur={(e) => void updateField(row, 'aisleShelf', e.target.value)}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (row.quantity_on_hand === 0) return <Badge variant="stockOutOfStock">Out of Stock</Badge>
        if (row.quantity_on_hand <= row.threshold)
          return <Badge variant="stockLowStock">Low Stock</Badge>
        return <Badge variant="stockInStock">In Stock</Badge>
      },
    },
    {
      key: 'restocked',
      header: 'Last Restocked',
      render: (row) => (row.last_restocked_at ? formatDate(row.last_restocked_at) : '—'),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Stock Levels"
        subtitle={`${rows.length} SKUs`}
        cta={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadTemplate}>
              <Download className="size-4" /> Template
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> Bulk Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCsvUpload(file)
                e.target.value = ''
              }}
            />
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4">
        <SimpleSelect
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          options={categories}
        />
        <SimpleSelect
          value={alertFilter}
          onValueChange={setAlertFilter}
          options={ALERT_STATUS_OPTIONS}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No stock items found"
        searchPlaceholder="Search by name or SKU..."
        onSearch={setSearch}
      />
    </div>
  )
}
