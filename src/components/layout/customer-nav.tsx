'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Package, Search, User } from 'lucide-react'

import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/categories', label: 'Categories', icon: LayoutGrid },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/account', label: 'Account', icon: User },
] as const

function CustomerNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-stone-200 bg-white md:hidden">
      <div className="grid h-full grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 border-t-2',
                isActive ? 'border-orange-500 text-orange-500' : 'border-transparent text-stone-400'
              )}
            >
              <Icon className="size-6" aria-hidden="true" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export { CustomerNav }
