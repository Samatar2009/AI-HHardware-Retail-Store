import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const {
    userId,
    role,
    error: authError,
  } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()

  let locationId: string | null
  if (role === 'admin') {
    const { data } = await supabase
      .from('locations')
      .select('id')
      .eq('is_active', true)
      .order('name_en')
      .limit(1)
      .single()
    locationId = data?.id ?? null
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('location_id')
      .eq('user_id', userId)
      .single()
    locationId = data?.location_id ?? null
  }

  if (!locationId) {
    return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
  }

  const selectClause =
    '*, customer:profiles!orders_customer_id_fkey(phone, full_name), order_items(*)'

  const [awaitingPrep, readyForPickup] = await Promise.all([
    supabase
      .from('orders')
      .select(selectClause)
      .eq('location_id', locationId)
      .eq('status', 'payment_confirmed')
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select(selectClause)
      .eq('location_id', locationId)
      .eq('status', 'ready_for_pickup')
      .order('created_at', { ascending: true }),
  ])

  return NextResponse.json({
    awaitingPrep: awaitingPrep.data ?? [],
    readyForPickup: readyForPickup.data ?? [],
    locationId,
  })
}
