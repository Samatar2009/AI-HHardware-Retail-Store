'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import type { DisplayCurrency } from '@/stores/currency.store'
import type { Locale } from '@/i18n/config'
import { setLocale } from '@/i18n/actions'
import { safeNext } from '@/lib/safe-next'

export default function CompleteProfilePage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next')) ?? '/'

  const profile = useAuthStore((s) => s.profile)
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  const [fullName, setFullName] = useState('')
  const [language, setLanguage] = useState<Locale>('en')
  const [currency, setCurrency] = useState<DisplayCurrency>('SLSH')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only new users with no name yet should land here.
  useEffect(() => {
    if (profile && profile.full_name) {
      router.replace(next)
    }
  }, [profile, next, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          preferred_language: language,
          preferred_currency: currency,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Could not save your profile. Please try again.')
        return
      }

      await setLocale(language)
      setUser(user, data.profile)
      router.push(next)
    } catch {
      setError('Could not save your profile. Please try again.')
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
            <h1 className="text-xl font-semibold text-stone-900">{t('completeProfile')}</h1>
          </div>

          <Input
            label={t('fullName')}
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={error ?? undefined}
          />

          <SimpleSelect
            label="Language"
            value={language}
            onValueChange={(v) => setLanguage(v as Locale)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'so', label: 'Somali' },
            ]}
          />

          <SimpleSelect
            label="Currency"
            value={currency}
            onValueChange={(v) => setCurrency(v as DisplayCurrency)}
            options={[
              { value: 'SLSH', label: 'SLSH' },
              { value: 'USD', label: 'USD' },
            ]}
          />

          <Button type="submit" variant="primary" size="lg" disabled={!fullName.trim()} loading={isSubmitting}>
            {tCommon('save')}
          </Button>
        </form>
      </div>
    </div>
  )
}
