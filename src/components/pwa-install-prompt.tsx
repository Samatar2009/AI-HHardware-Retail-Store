'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

const VISIT_COUNT_KEY = 'borama-pwa-visit-count'
const DISMISSED_UNTIL_KEY = 'borama-pwa-install-dismissed-until'
const DISMISS_DAYS = 7

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) ?? 0)
    if (dismissedUntil > Date.now()) return

    const visitCount = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? 0) + 1
    localStorage.setItem(VISIT_COUNT_KEY, String(visitCount))
    if (visitCount < 2) return

    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  function handleDismiss() {
    localStorage.setItem(
      DISMISSED_UNTIL_KEY,
      String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)
    )
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md px-4 md:bottom-4">
      <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-orange-500 text-white">
          <Download className="size-5" aria-hidden="true" />
        </div>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-stone-900">Install Borama Hardware</p>
          <p className="text-stone-500">Add to your home screen for fast, offline-ready access.</p>
        </div>
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
