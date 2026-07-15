import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const closeSessionSchema = z.object({
  endingCashSlsh: z.number().int().nonnegative(),
  endingCashUsd: z.number().nonnegative().default(0),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const {
    userId,
    role,
    error: authError,
  } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = closeSessionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid close data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data: session } = await supabase
    .from('pos_sessions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.status !== 'open') {
    return NextResponse.json({ error: 'Session is already closed' }, { status: 409 })
  }
  if (session.cashier_id !== userId && role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized to close this session' }, { status: 403 })
  }

  const expectedCash = session.starting_cash_slsh + session.total_cash_sales_slsh
  const cashVariance = body.endingCashSlsh - expectedCash

  const { data: updated, error } = await supabase
    .from('pos_sessions')
    .update({
      status: 'closed',
      ending_cash_slsh: body.endingCashSlsh,
      ending_cash_usd: body.endingCashUsd,
      cash_variance_slsh: cashVariance,
      closed_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: 'Could not close session' }, { status: 500 })
  }

  return NextResponse.json({ session: updated })
}
