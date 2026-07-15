'use client'

import { WifiOff, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-md bg-orange-500 font-bold text-white">
        BH
      </div>
      <div className="flex size-20 items-center justify-center rounded-full bg-orange-100">
        <WifiOff className="size-10 text-orange-500" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold text-stone-900">You are offline</h1>
      <p className="max-w-xs text-sm text-stone-500">
        This page hasn&apos;t been loaded before, so it isn&apos;t available offline. The POS
        terminal still works offline — sales are queued and sync automatically once you&apos;re back
        online.
      </p>
      <Button variant="primary" onClick={() => window.location.reload()}>
        <RotateCw className="size-4" aria-hidden="true" />
        Retry
      </Button>
    </div>
  )
}
