'use client'

import { useState } from 'react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'

interface VoidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId: string | null
  transactionNumber: string | null
  onVoided: () => void
}

function VoidDialog({ open, onOpenChange, transactionId, transactionNumber, onVoided }: VoidDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleVoid() {
    if (!transactionId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/pos/transactions/${transactionId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voidReason: reason }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Manager authorization required to void a sale')
        return
      }
      showSuccessToast('Transaction voided')
      setReason('')
      onOpenChange(false)
      onVoided()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Void Transaction {transactionNumber ? `#${transactionNumber}` : ''}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="mb-3 text-sm text-stone-500">Voiding requires manager (admin or inventory manager) sign-in and reverses inventory and any loyalty points earned.</p>
          <Textarea label="Void Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleVoid()} loading={isSubmitting} disabled={reason.trim().length < 3}>
            Void Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { VoidDialog }
