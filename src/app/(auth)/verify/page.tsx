'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { OtpInput } from '@/components/forms/otp-input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { createClient } from '@/lib/supabase/client'
import { ROLE_HOME_PATH } from '@/lib/constants'
import { safeNext } from '@/lib/safe-next'
import type { UserRole } from '@/types/auth'

const RESEND_COOLDOWN_SECONDS = 60

export default function VerifyPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') ?? ''
  const next = safeNext(searchParams.get('next'))
  const setUser = useAuthStore((s) => s.setUser)

  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (lockSecondsLeft <= 0) return
    const timer = setInterval(() => setLockSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [lockSecondsLeft])

  async function handleVerify() {
    if (otp.length !== 6 || isSubmitting || lockSecondsLeft > 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, token: otp }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 423) setLockSecondsLeft(15 * 60)
        setError(data.error ?? t('invalidCode'))
        setOtp('')
        return
      }

      // Sync the browser Supabase client with the session the server just
      // created, so future client-side calls (getSession/onAuthStateChange)
      // see the user as signed in immediately.
      const supabase = createClient()
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      setUser(data.session.user, data.profile)

      const role = data.profile.role as UserRole
      const destination = data.profile.full_name
        ? (next ?? ROLE_HOME_PATH[role])
        : `/complete-profile?next=${encodeURIComponent(next ?? ROLE_HOME_PATH[role])}`

      router.push(destination)
    } catch {
      setError('Could not verify code. Check connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setError(null)
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    if (res.ok) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtp('')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Could not send code. Check connection and try again.')
    }
  }

  const lastFourDigits = phone.slice(-4)

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex h-24 items-center justify-center bg-orange-500">
        <span className="text-2xl font-bold text-white">Borama Hardware</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">{t('enterCode')}</h1>
            <p className="mt-1 text-sm text-stone-500">
              {t('codeSent', { phone: `•••• ${lastFourDigits}` })}
            </p>
          </div>

          <OtpInput
            value={otp}
            onChange={setOtp}
            error={error ?? undefined}
            disabled={lockSecondsLeft > 0}
          />

          {lockSecondsLeft > 0 && (
            <p className="text-xs text-red-600">
              Try again in {Math.floor(lockSecondsLeft / 60)}:
              {String(lockSecondsLeft % 60).padStart(2, '0')}
            </p>
          )}

          <Button
            onClick={handleVerify}
            variant="primary"
            size="lg"
            disabled={otp.length !== 6 || lockSecondsLeft > 0}
            loading={isSubmitting}
          >
            {t('verify')}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || lockSecondsLeft > 0}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  )
}
