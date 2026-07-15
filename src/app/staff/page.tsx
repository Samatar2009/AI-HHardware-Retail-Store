import Link from 'next/link'
import { CreditCard, Package, RotateCcw } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { KpiCard } from '@/components/admin/kpi-card'
import { Button } from '@/components/ui/button'

export const revalidate = 0

async function resolveLocationId(userId: string, role: string | undefined) {
  const supabase = await createClient()
  if (role === 'admin') {
    const { data } = await supabase
      .from('locations')
      .select('id')
      .eq('is_active', true)
      .order('name_en')
      .limit(1)
      .single()
    return data?.id ?? null
  }
  const { data } = await supabase
    .from('profiles')
    .select('location_id')
    .eq('user_id', userId)
    .single()
  return data?.location_id ?? null
}

export default async function StaffOverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user!.id)
    .single()
  const locationId = await resolveLocationId(user!.id, profile?.role)

  let pendingPayments = 0
  let readyForPickup = 0
  let pendingReturns = 0

  if (locationId) {
    const [payments, pickups, returns] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'payment_submitted'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'ready_for_pickup'),
      supabase
        .from('returns')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'pending'),
    ])
    pendingPayments = payments.count ?? 0
    readyForPickup = pickups.count ?? 0
    pendingReturns = returns.count ?? 0
  }

  return (
    <div>
      <PageHeader title="Staff Overview" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <KpiCard
            icon={CreditCard}
            label="Pending Payment Confirmations"
            value={String(pendingPayments)}
          />
          <Link href="/staff/payments">
            <Button variant="secondary" className="w-full">
              Review Payments
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <KpiCard icon={Package} label="Ready for Pickup" value={String(readyForPickup)} />
          <Link href="/staff/pickup">
            <Button variant="secondary" className="w-full">
              Manage Pickups
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <KpiCard icon={RotateCcw} label="Pending Returns" value={String(pendingReturns)} />
          <Link href="/staff/returns">
            <Button variant="secondary" className="w-full">
              Review Returns
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
