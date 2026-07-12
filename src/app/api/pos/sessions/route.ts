import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pos_sessions')
    .select('*, location:locations(name_en)')
    .eq('cashier_id', userId)
    .eq('status', 'open')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Could not load session' }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}

const openSessionSchema = z.object({
  startingCashSlsh: z.number().int().nonnegative(),
  startingCashUsd: z.number().nonnegative().default(0),
})

export async function POST(request: Request) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = openSessionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid session data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('location_id').eq('user_id', userId).single()

  if (!profile?.location_id) {
    return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
  }

  const { data: session, error } = await supabase
    .from('pos_sessions')
    .insert({
      cashier_id: userId,
      location_id: profile.location_id,
      starting_cash_slsh: body.startingCashSlsh,
      starting_cash_usd: body.startingCashUsd,
    })
    .select('*, location:locations(name_en)')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already have an open session' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not open session' }, { status: 500 })
  }

  return NextResponse.json({ session })
}
