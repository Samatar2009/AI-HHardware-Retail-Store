'use client'

import { usePathname } from 'next/navigation'

import { StaffHeader } from '@/components/layout/staff-header'

const TITLE_MAP: Record<string, string> = {
  payments: 'Payment Confirmation',
  pickup: 'Pickup',
  returns: 'Returns',
}

function StaffHeaderDynamic() {
  const pathname = usePathname()
  const segment = pathname.split('/')[2]
  const title = segment ? (TITLE_MAP[segment] ?? 'Staff Portal') : 'Overview'

  return <StaffHeader title={title} />
}

export { StaffHeaderDynamic }
