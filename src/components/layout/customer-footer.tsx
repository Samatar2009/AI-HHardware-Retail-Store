'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Phone } from 'lucide-react'

function CustomerFooter() {
  const t = useTranslations('common')

  return (
    <footer className="border-t border-stone-700 bg-stone-900">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-lg font-bold text-white">{t('appName')}</span>
          <nav className="flex gap-6 text-sm text-stone-400">
            <Link href="/about" className="transition-colors duration-100 hover:text-white">
              About
            </Link>
            <Link href="/contact" className="transition-colors duration-100 hover:text-white">
              Contact
            </Link>
            <Link href="/privacy" className="transition-colors duration-100 hover:text-white">
              Privacy
            </Link>
          </nav>
          <a
            href="tel:+252638315010"
            className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors duration-100 hover:text-white"
          >
            <Phone className="size-4" aria-hidden="true" />
            +252 63 831 5010
          </a>
        </div>
        <p className="text-xs text-stone-500">© {new Date().getFullYear()} Borama Hardware. Borama, Somaliland.</p>
      </div>
    </footer>
  )
}

export { CustomerFooter }
