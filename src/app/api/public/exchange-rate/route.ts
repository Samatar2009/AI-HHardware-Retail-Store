import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Phase 5 originally cached this for 5 minutes (revalidate=300), but Phase 7's
// checkpoint requires an admin rate change to be immediately reflected in
// customer-facing prices, so this route is fully dynamic instead.
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('usd_to_slsh_rate, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Exchange rate not available' }, { status: 500 })
  }

  return NextResponse.json({ rate: data.usd_to_slsh_rate, asOf: data.created_at })
}
