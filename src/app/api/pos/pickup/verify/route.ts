import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const bodySchema = z.object({ pickupCode: z.string().min(1).max(20) })

// Read-only lookup by pickup code. The "Confirm Handover" step that
// actually marks the order completed reuses PATCH
// /api/admin/orders/[id]/complete (Phase 7) — same business rule (order
// must be ready_for_pickup, awards loyalty via the existing DB trigger),
// so there's no reason to duplicate that logic here.
export async function POST(request: Request) {
  const { userId, role, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'A pickup code is required' }, { status: 400 })
  }

  const supabase = await createClient()

  let locationId: string | null = null
  if (role !== 'admin') {
    const { data: profile } = await supabase.from('profiles').select('location_id').eq('user_id', userId).single()
    locationId = profile?.location_id ?? null
    if (!locationId) {
      return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
    }
  }

  let query = supabase
    .from('orders')
    .select('*, customer:profiles!orders_customer_id_fkey(phone, full_name), order_items(*)')
    .eq('pickup_code', parsed.data.pickupCode.toUpperCase())
    .eq('status', 'ready_for_pickup')

  if (locationId) query = query.eq('location_id', locationId)

  const { data: order, error } = await query.maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'No order ready for pickup with that code at this location' }, { status: 404 })
  }

  return NextResponse.json({ order })
}
