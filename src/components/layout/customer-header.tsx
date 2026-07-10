'use client'

import Link from 'next/link'
import { ShoppingCart, User } from 'lucide-react'

import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import { LanguageToggle } from '@/components/language-toggle'
import { CurrencyToggle } from '@/components/currency-toggle'
import { SearchInput } from '@/components/forms/search-input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function CustomerHeader() {
  const profile = useAuthStore((s) => s.profile)
  const itemCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0))

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-stone-200 bg-white shadow-sm">
      <div className="mx-auto flex h-full max-w-screen-xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-orange-600">
          Borama Hardware
        </Link>

        <div className="hidden max-w-lg flex-1 sm:block">
          <SearchInput onSearch={() => {}} placeholder="Search products..." />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <CurrencyToggle />

          <Link
            href="/cart"
            aria-label="Cart"
            className={cn(
              'relative rounded-md p-2 text-stone-700 transition-colors duration-100',
              'hover:bg-stone-100 motion-reduce:transition-none motion-reduce:duration-0'
            )}
          >
            <ShoppingCart className="size-5" />
            {itemCount > 0 && (
              <span
                className={cn(
                  'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full',
                  'bg-orange-500 text-[10px] font-bold text-white'
                )}
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {profile ? (
            <Link href="/orders" aria-label="Account">
              <Avatar>
                <AvatarFallback>{getInitials(profile.full_name || profile.phone)}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link
              href="/sign-in"
              aria-label="Sign in"
              className="rounded-md p-2 text-stone-700 transition-colors duration-100 hover:bg-stone-100"
            >
              <User className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export { CustomerHeader }
