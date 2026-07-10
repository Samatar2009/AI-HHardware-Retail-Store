'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Award,
  BarChart3,
  CreditCard,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  Percent,
  RotateCcw,
  ArrowLeftRight,
  Box,
  Sparkles,
  Users,
} from 'lucide-react'

import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Store',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: Package },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: Box },
      { href: '/admin/categories', label: 'Categories', icon: LayoutGrid },
      { href: '/admin/discounts', label: 'Discounts', icon: Percent },
      { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/staff', label: 'Staff', icon: Users },
      { href: '/admin/locations', label: 'Locations', icon: MapPin },
      { href: '/admin/payment-settings', label: 'Payment Settings', icon: CreditCard },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/insights', label: 'AI Insights', icon: Sparkles },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/audit', label: 'Audit Log', icon: History },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/admin/settings/exchange-rate', label: 'Exchange Rate', icon: ArrowLeftRight },
      { href: '/admin/settings/loyalty', label: 'Loyalty Config', icon: Award },
    ],
  },
]

function AdminSidebar() {
  const pathname = usePathname()
  const profile = useAuthStore((s) => s.profile)
  const { signOut } = useAuth()

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-64 flex-col bg-stone-900">
      <div className="flex h-16 items-center border-b border-stone-700 px-6">
        <span className="text-lg font-bold text-white">Borama Hardware</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500 first:mt-0">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                    'transition-colors duration-100 motion-reduce:transition-none motion-reduce:duration-0',
                    isActive ? 'bg-orange-500 text-white' : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                  )}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto rounded-full bg-orange-500 px-1.5 text-[10px] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-stone-700 p-4">
        {profile && (
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{getInitials(profile.full_name || profile.phone)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{profile.full_name || profile.phone}</p>
            </div>
            <Badge variant="roleAdmin">Admin</Badge>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-400 transition-colors duration-100 hover:text-white"
        >
          <LogOut className="size-5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export { AdminSidebar }
