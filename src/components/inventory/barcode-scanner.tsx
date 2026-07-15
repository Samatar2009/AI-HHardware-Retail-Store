'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { ScanLine } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (sku: string) => void
}

function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    setError(null)

    reader
      .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          onScan(result.getText())
          onOpenChange(false)
        }
        // NotFoundException fires continuously between frames while no
        // barcode is in view — that's expected, not an error to surface.
        if (err && err.name !== 'NotFoundException') {
          setError('Camera error — check permissions and try again.')
        }
      })
      .catch(() => setError('Could not access camera. Check browser permissions.'))

    return () => {
      readerRef.current?.reset()
      readerRef.current = null
    }
  }, [open, onScan, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-orange-500" /> Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-4">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <video
              ref={videoRef}
              className="aspect-video w-full rounded-md bg-black"
              muted
              playsInline
            />
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export { BarcodeScanner }
