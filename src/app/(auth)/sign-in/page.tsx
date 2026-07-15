'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { PhoneInput } from '@/components/forms/phone-input'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { isValidAuthPhone } from '@/lib/validators'
import { safeNext } from '@/lib/safe-next'

const IS_DEV = process.env.NODE_ENV === 'development'

export default function SignInPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const [phone, setPhone] = useState('+252')
  const [devPhone, setDevPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dev-only override: PhoneInput always forces a +252 prefix, so local
  // testing with a real non-Somaliland number (Twilio can't text a fake
  // one) needs a raw entry point. Bypassed entirely in production builds —
  // see isValidAuthPhone in src/lib/validators.ts.
  const effectivePhone = IS_DEV && devPhone ? devPhone : phone
  const isValidPhone = isValidAuthPhone(effectivePhone)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidPhone || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: effectivePhone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Could not send code. Check connection and try again.')
        return
      }

      const verifyUrl = new URL('/verify', window.location.origin)
      verifyUrl.searchParams.set('phone', effectivePhone)
      if (next) verifyUrl.searchParams.set('next', next)
      router.push(verifyUrl.pathname + verifyUrl.search)
    } catch {
      setError('Could not send code. Check connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex h-24 items-center justify-center bg-orange-500">
        <span className="text-2xl font-bold text-white">Borama Hardware</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">{t('signIn')}</h1>
            <p className="mt-1 text-sm text-stone-500">{t('phoneNumber')}</p>
          </div>

          <PhoneInput value={phone} onChange={setPhone} label={t('phoneNumber')} error={error ?? undefined} required />

          {IS_DEV && (
            <Input
              label="Dev only: test with any E.164 number"
              placeholder="+16135014762"
              value={devPhone}
              onChange={(e) => setDevPhone(e.target.value.trim())}
              helperText="Overrides the Somaliland field above. Never available in production."
            />
          )}

          <Button type="submit" variant="primary" size="lg" disabled={!isValidPhone} loading={isSubmitting}>
            {t('sendCode')}
          </Button>
        </form>
      </div>
    </div>
  )
}
