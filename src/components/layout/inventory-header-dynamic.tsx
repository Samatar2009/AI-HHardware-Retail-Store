'use client'

import { usePathname } from 'next/navigation'

import { InventoryHeader } from '@/components/layout/inventory-header'

const TITLE_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  stock: 'Stock Levels',
  receive: 'Receive Stock',
  stocktakes: 'Stocktakes',
  alerts: 'Alerts',
  forecasts: 'Forecasts',
}

function InventoryHeaderDynamic() {
  const pathname = usePathname()
  const segment = pathname.split('/')[2] ?? 'dashboard'
  const title = TITLE_MAP[segment] ?? 'Inventory'

  return <InventoryHeader title={title} />
}

export { InventoryHeaderDynamic }
