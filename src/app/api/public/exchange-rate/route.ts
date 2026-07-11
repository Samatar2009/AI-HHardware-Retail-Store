import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const revalidate = 300

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
