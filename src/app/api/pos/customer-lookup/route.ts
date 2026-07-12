import { NextResponse } from 'next/server'

import { requireRole } from '@/lib/require-role'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const phone = (searchParams.get('phone') ?? '').trim()

  if (!phone) {
    return NextResponse.json({ error: 'A phone number is required' }, { status: 400 })
  }

  // Customer profiles have no location_id, so the staff-same-location RLS
  // read policy can never match them — the admin client is required here to
  // look up a customer regardless of the cashier's own location.
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('user_id, full_name, phone')
    .eq('phone', phone)
    .eq('role', 'customer')
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ customer: null })
  }

  const { data: loyaltyCard } = await admin
    .from('loyalty_cards')
    .select('card_number, current_points, current_tier')
    .eq('customer_id', profile.user_id)
    .maybeSingle()

  return NextResponse.json({
    customer: {
      userId: profile.user_id,
      fullName: profile.full_name,
      phone: profile.phone,
      loyaltyCard,
    },
  })
}
