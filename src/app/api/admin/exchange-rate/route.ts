import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireRole } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireRole(['admin', 'cashier', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*, set_by_profile:profiles!exchange_rates_set_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: 'Could not load exchange rate history' }, { status: 500 })
  }

  return NextResponse.json({ rates: data })
}

const setRateSchema = z.object({ rate: z.number().positive() })

export async function POST(request: Request) {
  const { userId, error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = setRateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rate' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exchange_rates')
    .insert({ usd_to_slsh_rate: parsed.data.rate, set_by: userId })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not set exchange rate' }, { status: 500 })
  }

  return NextResponse.json({ rate: data })
}
