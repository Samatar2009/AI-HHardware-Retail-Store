'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { showErrorToast } from '@/components/ui/toast'
import { usePosStore } from '@/stores/pos.store'
import type { PosSession } from '@/types/pos'

export default function PosOpenSessionPage() {
  const router = useRouter()
  const setActiveSession = usePosStore((s) => s.setActiveSession)

  const [isChecking, setIsChecking] = useState(true)
  const [startingCashSlsh, setStartingCashSlsh] = useState('')
  const [startingCashUsd, setStartingCashUsd] = useState('0')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void checkActiveSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkActiveSession() {
    try {
      const res = await fetch('/api/pos/sessions/active')
      if (res.ok) {
        const data = (await res.json()) as { session: PosSession | null }
        if (data.session) {
          setActiveSession(data.session)
          router.replace('/pos')
          return
        }
      }
    } finally {
      setIsChecking(false)
    }
  }

  async function handleOpen() {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/pos/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startingCashSlsh: Number(startingCashSlsh) || 0,
          startingCashUsd: Number(startingCashUsd) || 0,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not open session')
        return
      }
      const data = (await res.json()) as { session: PosSession }
      setActiveSession(data.session)
      router.replace('/pos')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 p-8">
        <h1 className="mb-1 text-xl font-bold text-white">Open Register</h1>
        <p className="mb-6 text-sm text-stone-400">Enter the starting cash float to begin your shift.</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-300">Starting Cash (SLSH)</label>
            <Input
              type="number"
              value={startingCashSlsh}
              onChange={(e) => setStartingCashSlsh(e.target.value)}
              className="border-stone-600 bg-stone-800 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-300">Starting Cash (USD)</label>
            <Input
              type="number"
              value={startingCashUsd}
              onChange={(e) => setStartingCashUsd(e.target.value)}
              className="border-stone-600 bg-stone-800 text-white"
            />
          </div>

          <Button onClick={() => void handleOpen()} loading={isSubmitting} disabled={!startingCashSlsh} className="mt-2">
            Open Register
          </Button>
        </div>
      </div>
    </div>
  )
}
