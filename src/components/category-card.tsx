'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { LayoutGrid } from 'lucide-react'

import { cn } from '@/lib/utils'

interface CategoryCardProps {
  slug: string
  nameEn: string
  nameSo: string
  iconUrl?: string | null
}

function CategoryCard({ slug, nameEn, nameSo, iconUrl }: CategoryCardProps) {
  const locale = useLocale()
  const name = locale === 'so' ? nameSo : nameEn

  return (
    <Link
      href={`/categories/${slug}`}
      className={cn(
        'flex flex-col items-center gap-2 rounded-md border border-stone-200 bg-white p-4 text-center',
        'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
        'hover:border-orange-300 hover:shadow-md'
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-orange-100">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="size-8 object-contain" />
        ) : (
          <LayoutGrid className="size-8 text-orange-500" aria-hidden="true" />
        )}
      </div>
      <p className="text-sm font-medium text-stone-900">{name}</p>
    </Link>
  )
}

export { CategoryCard }
