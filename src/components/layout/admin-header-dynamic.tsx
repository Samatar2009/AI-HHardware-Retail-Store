'use client'

import { usePathname } from 'next/navigation'

import { AdminHeader } from '@/components/layout/admin-header'

const TITLE_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  orders: 'Orders',
  staff: 'Staff',
  settings: 'Settings',
  analytics: 'Analytics',
  insights: 'AI Insights',
  audit: 'Audit Log',
  banners: 'Banners',
  discounts: 'Discounts',
  locations: 'Locations',
}

function AdminHeaderDynamic() {
  const pathname = usePathname()
  const segment = pathname.split('/')[2] ?? 'dashboard'
  const title = TITLE_MAP[segment] ?? 'Admin'

  return <AdminHeader title={title} />
}

export { AdminHeaderDynamic }
