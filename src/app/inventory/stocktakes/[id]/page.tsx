'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/auth.store'

interface StocktakeItem {
  id: string
  system_quantity: number
  counted_quantity: number
  discrepancy: number
  product: { name_en: string; sku_base: string } | null
  variant: { sku: string } | null
}

interface StocktakeDetail {
  id: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  rejection_reason: string | null
  location: { name_en: string } | null
  stocktake_items: StocktakeItem[]
}

const STATUS_BADGE: Record<StocktakeDetail['status'], NonNullable<BadgeProps['variant']>> = {
  draft: 'paymentPending',
  submitted: 'orderPendingVerification',
  approved: 'orderCompleted',
  rejected: 'orderCancelled',
}

export default function InventoryStocktakesIdPage() {
  const params = useParams<{ id: string }>()
  const role = useAuthStore((s) => s.role)

  const [stocktake, setStocktake] = useState<StocktakeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDiscrepanciesOnly, setShowDiscrepanciesOnly] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    void loadStocktake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadStocktake() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/inventory/stocktakes/${params.id}`)
      if (res.ok) {
        const data = (await res.json()) as { stocktake: StocktakeDetail }
        setStocktake(data.stocktake)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function updateCount(itemId: string, countedQuantity: number) {
    const res = await fetch(`/api/inventory/stocktakes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ itemId, countedQuantity }] }),
    })
    if (res.ok) {
      const data = (await res.json()) as { stocktake: StocktakeDetail }
      setStocktake(data.stocktake)
    }
  }

  async function submitForApproval() {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/inventory/stocktakes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit: true }),
      })
      if (!res.ok) {
        showErrorToast('Could not submit stocktake')
        return
      }
      showSuccessToast('Stocktake submitted for approval')
      void loadStocktake()
    } finally {
      setIsSaving(false)
    }
  }

  async function approve() {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/inventory/stocktakes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: true }),
      })
      if (!res.ok) {
        showErrorToast('Could not approve stocktake')
        return
      }
      showSuccessToast('Stocktake approved — inventory corrected')
      void loadStocktake()
    } finally {
      setIsSaving(false)
    }
  }

  async function reject() {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/inventory/stocktakes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject: true, rejectionReason }),
      })
      if (!res.ok) {
        showErrorToast('Could not reject stocktake')
        return
      }
      showSuccessToast('Stocktake rejected')
      setRejectDialogOpen(false)
      void loadStocktake()
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !stocktake) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const discrepancyItems = stocktake.stocktake_items.filter((i) => i.discrepancy !== 0)
  const isDraft = stocktake.status === 'draft'
  const isSubmitted = stocktake.status === 'submitted'

  function renderTable(items: StocktakeItem[]) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>System Qty</TableHead>
            <TableHead>Counted Qty</TableHead>
            <TableHead>Discrepancy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.product?.name_en}</TableCell>
              <TableCell>{item.variant?.sku ?? item.product?.sku_base}</TableCell>
              <TableCell>{item.system_quantity}</TableCell>
              <TableCell>
                {isDraft ? (
                  <Input
                    type="number"
                    defaultValue={item.counted_quantity}
                    className="h-8 w-24"
                    onBlur={(e) => void updateCount(item.id, Number(e.target.value))}
                  />
                ) : (
                  item.counted_quantity
                )}
              </TableCell>
              <TableCell className={item.discrepancy === 0 ? '' : item.discrepancy > 0 ? 'text-green-600' : 'text-red-600'}>
                {item.discrepancy > 0 ? '+' : ''}
                {item.discrepancy}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Stocktake — ${stocktake.location?.name_en ?? ''}`}
        subtitle={stocktake.id}
        cta={
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_BADGE[stocktake.status]}>{stocktake.status}</Badge>
            {isDraft && (
              <Button onClick={() => void submitForApproval()} loading={isSaving}>
                Submit for Approval
              </Button>
            )}
            {isSubmitted && role === 'admin' && (
              <>
                <Button variant="secondary" onClick={() => setRejectDialogOpen(true)}>
                  Reject
                </Button>
                <Button onClick={() => void approve()} loading={isSaving}>
                  Approve
                </Button>
              </>
            )}
          </div>
        }
      />

      {stocktake.status === 'rejected' && stocktake.rejection_reason && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent>
            <p className="text-sm text-red-700">Rejected: {stocktake.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Tabs value={showDiscrepanciesOnly ? 'discrepancies' : 'all'} onValueChange={(v) => setShowDiscrepanciesOnly(v === 'discrepancies')}>
            <TabsList>
              <TabsTrigger value="all">All ({stocktake.stocktake_items.length})</TabsTrigger>
              <TabsTrigger value="discrepancies">Discrepancies Only ({discrepancyItems.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">{renderTable(stocktake.stocktake_items)}</TabsContent>
            <TabsContent value="discrepancies">{renderTable(discrepancyItems)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reject Stocktake</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Textarea
              label="Rejection Reason"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void reject()} disabled={!rejectionReason} loading={isSaving}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
