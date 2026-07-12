import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

const updateSchema = z.object({
  merchantNumber: z.string().min(1).optional(),
  instructionsEn: z.string().min(1).optional(),
  instructionsSo: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.merchantNumber !== undefined) updates.merchant_number = body.merchantNumber
  if (body.instructionsEn !== undefined) updates.instructions_en = body.instructionsEn
  if (body.instructionsSo !== undefined) updates.instructions_so = body.instructionsSo
  if (body.isActive !== undefined) updates.is_active = body.isActive

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('mobile_money_settings').update(updates).eq('id', params.id).select().single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update mobile money setting' }, { status: 500 })
  }

  return NextResponse.json({ setting: data })
}
