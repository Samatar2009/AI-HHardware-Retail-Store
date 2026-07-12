import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireRole } from '@/lib/require-role'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'cashier', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase.from('mobile_money_settings').select('*').eq('location_id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Could not load mobile money settings' }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}

const createSchema = z.object({
  provider: z.enum(['zaad', 'edahab', 'evc_plus', 'sahal']),
  merchantNumber: z.string().min(1),
  instructionsEn: z.string().min(1),
  instructionsSo: z.string().min(1),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid mobile money data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mobile_money_settings')
    .insert({
      location_id: params.id,
      provider: body.provider,
      merchant_number: body.merchantNumber,
      instructions_en: body.instructionsEn,
      instructions_so: body.instructionsSo,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not create mobile money setting' }, { status: 500 })
  }

  return NextResponse.json({ setting: data })
}
