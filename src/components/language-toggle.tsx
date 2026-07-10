'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

import { setLocale } from '@/i18n/actions'
import type { Locale } from '@/i18n/config'
import { useUiStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils'

function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale() as Locale
  const router = useRouter()
  const setActiveLanguage = useUiStore((s) => s.setActiveLanguage)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next: Locale = locale === 'en' ? 'so' : 'en'
    startTransition(async () => {
      await setLocale(next)
      setActiveLanguage(next)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label="Toggle language"
      className={cn(
        'inline-flex items-center rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700',
        'transition-colors duration-100 motion-reduce:transition-none motion-reduce:duration-0',
        'hover:bg-stone-50 disabled:opacity-50',
        className
      )}
    >
      <span className={locale === 'en' ? 'text-orange-600' : ''}>EN</span>
      <span className="mx-1 text-stone-300">/</span>
      <span className={locale === 'so' ? 'text-orange-600' : ''}>SO</span>
    </button>
  )
}

export { LanguageToggle }
