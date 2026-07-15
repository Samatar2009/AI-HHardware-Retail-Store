import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

// Walk-in fallback for a customer who lost their pickup code — look up by
// order number or phone instead.
export async function GET(request: Request) {
  const {
    userId,
    role,
    error: authError,
  } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ orders: [] })
  }

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

  const safeQuery = q
    .replace(/[,()%*\\]/g, ' ')
    .trim()
    .slice(0, 100)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, customer:profiles!orders_customer_id_fkey(phone, full_name), order_items(*)')
    .eq('location_id', locationId)
    .in('status', ['payment_confirmed', 'ready_for_pickup'])
    .ilike('order_number', `%${safeQuery}%`)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  // Phone lives on the joined profile, which PostgREST can't filter on
  // directly from the orders side — resolve matching customers first, then
  // look up their orders and merge with the order-number results.
  const { data: matchingCustomers } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('phone', `%${safeQuery}%`)
    .eq('role', 'customer')

  const merged = new Map((orders ?? []).map((o) => [o.id, o]))

  if (matchingCustomers && matchingCustomers.length > 0) {
    const { data: byPhone } = await supabase
      .from('orders')
      .select('*, customer:profiles!orders_customer_id_fkey(phone, full_name), order_items(*)')
      .eq('location_id', locationId)
      .in('status', ['payment_confirmed', 'ready_for_pickup'])
      .in(
        'customer_id',
        matchingCustomers.map((c) => c.user_id)
      )
      .limit(10)

    for (const o of byPhone ?? []) merged.set(o.id, o)
  }

  return NextResponse.json({ orders: [...merged.values()] })
}
