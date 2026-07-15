'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface AlertRow {
  id: string
  alert_type: 'low_stock' | 'out_of_stock'
  created_at: string
  product: { name_en: string } | null
  variant: { sku: string } | null
}

export default function InventoryAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void loadAlerts()
  }, [])

  async function loadAlerts() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/alerts')
      if (res.ok) {
        const data = (await res.json()) as { alerts: AlertRow[] }
        setAlerts(data.alerts)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function resolveAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    const res = await fetch(`/api/inventory/alerts/${id}`, { method: 'PATCH' })
    if (!res.ok) {
      showErrorToast('Could not resolve alert')
      void loadAlerts()
    } else {
      showSuccessToast('Alert resolved')
    }
  }

  return (
    <div>
      <PageHeader title="Alerts" subtitle={`${alerts.length} unresolved`} />

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading...</p>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No unresolved alerts"
          description="All stock levels are healthy."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between rounded-md border border-stone-200 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    alert.alert_type === 'out_of_stock' ? 'stockOutOfStock' : 'stockLowStock'
                  }
                >
                  {alert.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                </Badge>
                <div>
                  <p className="font-medium text-stone-900">{alert.product?.name_en}</p>
                  <p className="text-xs text-stone-500">
                    {alert.variant?.sku} · {formatDate(alert.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/inventory/receive">
                  <Button variant="secondary" size="sm">
                    Receive Stock
                  </Button>
                </Link>
                <Button size="sm" onClick={() => void resolveAlert(alert.id)}>
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
