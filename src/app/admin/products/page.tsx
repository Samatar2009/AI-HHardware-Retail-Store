'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SimpleSelect } from '@/components/ui/select'

interface AdminProductRow {
  id: string
  name_en: string
  sku_base: string
  is_featured: boolean
  is_active: boolean
  category: { name_en: string } | null
  product_variants: { id: string }[]
  product_images: { thumbnail_url: string; sort_order: number }[]
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    void loadProducts()
  }, [])

  async function loadProducts() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const data = (await res.json()) as { products: AdminProductRow[] }
        setProducts(data.products)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleField(id: string, field: 'is_featured' | 'is_active', value: boolean) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
    const key = field === 'is_featured' ? 'isFeatured' : 'isActive'
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter === 'active' && !p.is_active) return false
      if (statusFilter === 'inactive' && p.is_active) return false
      if (
        search &&
        !p.name_en.toLowerCase().includes(search.toLowerCase()) &&
        !p.sku_base.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [products, statusFilter, search])

  const columns: DataTableColumn<AdminProductRow>[] = [
    {
      key: 'image',
      header: '',
      render: (row) => {
        const thumb = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]
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
      header: 'Name',
      sortable: true,
      sortValue: (row) => row.name_en,
      render: (row) => <span className="font-medium text-stone-900">{row.name_en}</span>,
    },
    { key: 'sku', header: 'SKU', render: (row) => row.sku_base },
    { key: 'category', header: 'Category', render: (row) => row.category?.name_en ?? '—' },
    { key: 'variants', header: 'Variants', render: (row) => row.product_variants.length },
    {
      key: 'featured',
      header: 'Featured',
      render: (row) => (
        <Switch
          checked={row.is_featured}
          onCheckedChange={(v) => void toggleField(row.id, 'is_featured', v)}
        />
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.is_active}
            onCheckedChange={(v) => void toggleField(row.id, 'is_active', v)}
          />
          <Badge variant={row.is_active ? 'stockInStock' : 'orderCancelled'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Link href={`/admin/products/${row.id}`}>
          <Button variant="ghost" size="sm">
            <Pencil className="size-3.5" /> Edit
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} total products`}
        cta={
          <Link href="/admin/products/new">
            <Button>
              <Plus className="size-4" /> New Product
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="w-48">
          <SimpleSelect
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active only' },
              { value: 'inactive', label: 'Inactive only' },
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No products found"
        emptyDescription="Create your first product to get started."
        searchPlaceholder="Search by name or SKU..."
        onSearch={setSearch}
      />
    </div>
  )
}
