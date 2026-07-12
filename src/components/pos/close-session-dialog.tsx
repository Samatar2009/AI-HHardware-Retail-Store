'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'
import { formatSLSH } from '@/lib/utils'
import { usePosStore } from '@/stores/pos.store'
import type { PosSession } from '@/types/pos'

interface CloseSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: PosSession
}

function CloseSessionDialog({ open, onOpenChange, session }: CloseSessionDialogProps) {
  const router = useRouter()
  const setActiveSession = usePosStore((s) => s.setActiveSession)
  const [endingCashSlsh, setEndingCashSlsh] = useState('')
  const [endingCashUsd, setEndingCashUsd] = useState('0')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const expectedCash = session.starting_cash_slsh + session.total_cash_sales_slsh
  const variance = endingCashSlsh ? Number(endingCashSlsh) - expectedCash : 0

  async function handleClose() {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/pos/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endingCashSlsh: Number(endingCashSlsh) || 0,
          endingCashUsd: Number(endingCashUsd) || 0,
        }),
      })
      if (!res.ok) {
        showErrorToast('Could not close session')
        return
      }
      showSuccessToast('Register closed')
      setActiveSession(null)
      onOpenChange(false)
      router.replace('/pos/open-session')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Close Register</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <p className="text-sm text-stone-500">
            Total sales this session: {formatSLSH(session.total_sales_slsh)} · Cash sales: {formatSLSH(session.total_cash_sales_slsh)}
          </p>
          <Input label="Ending Cash (SLSH)" type="number" value={endingCashSlsh} onChange={(e) => setEndingCashSlsh(e.target.value)} />
          <Input label="Ending Cash (USD)" type="number" value={endingCashUsd} onChange={(e) => setEndingCashUsd(e.target.value)} />
          {endingCashSlsh && (
            <p className={`text-sm font-medium ${variance === 0 ? 'text-stone-600' : variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
              Variance: {variance > 0 ? '+' : ''}
              {formatSLSH(variance)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleClose()} loading={isSubmitting} disabled={!endingCashSlsh}>
            Confirm Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { CloseSessionDialog }
