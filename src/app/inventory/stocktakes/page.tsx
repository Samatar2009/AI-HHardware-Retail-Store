'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface StocktakeRow {
  id: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  created_at: string
  location: { name_en: string } | null
  initiated_by_profile: { full_name: string | null; phone: string } | null
}

const STATUS_BADGE: Record<StocktakeRow['status'], NonNullable<BadgeProps['variant']>> = {
  draft: 'paymentPending',
  submitted: 'orderPendingVerification',
  approved: 'orderCompleted',
  rejected: 'orderCancelled',
}

export default function InventoryStocktakesPage() {
  const [stocktakes, setStocktakes] = useState<StocktakeRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    void loadStocktakes()
  }, [])

  async function loadStocktakes() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/stocktakes')
      if (res.ok) {
        const data = (await res.json()) as { stocktakes: StocktakeRow[] }
        setStocktakes(data.stocktakes)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function startNewStocktake() {
    setIsCreating(true)
    try {
      const res = await fetch('/api/inventory/stocktakes', { method: 'POST' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not start stocktake')
        return
      }
      showSuccessToast('Stocktake started')
      void loadStocktakes()
    } finally {
      setIsCreating(false)
    }
  }

  const columns: DataTableColumn<StocktakeRow>[] = [
    {
      key: 'id',
      header: 'Stocktake',
      render: (row) => (
        <Link href={`/inventory/stocktakes/${row.id}`} className="font-medium text-orange-600 hover:underline">
          {row.id.slice(0, 8)}
        </Link>
      ),
    },
    { key: 'location', header: 'Location', render: (row) => row.location?.name_en ?? '—' },
    {
      key: 'initiated_by',
      header: 'Started By',
      render: (row) => row.initiated_by_profile?.full_name || row.initiated_by_profile?.phone || '—',
    },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge> },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.created_at) },
  ]

  return (
    <div>
      <PageHeader
        title="Stocktakes"
        subtitle={`${stocktakes.length} stocktakes`}
        cta={
          <Button onClick={() => void startNewStocktake()} loading={isCreating}>
            <Plus className="size-4" /> Start New Stocktake
          </Button>
        }
      />

      <DataTable columns={columns} data={stocktakes} getRowId={(row) => row.id} isLoading={isLoading} emptyTitle="No stocktakes yet" />
    </div>
  )
}
