import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

const updateDiscountSchema = z.object({
  value: z.number().positive().optional(),
  minimumOrderSlsh: z.number().int().nonnegative().optional(),
  maxTotalUses: z.number().int().positive().nullable().optional(),
  maxUsesPerCustomer: z.number().int().positive().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = updateDiscountSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid discount data' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.value !== undefined) updates.value = body.value
  if (body.minimumOrderSlsh !== undefined) updates.minimum_order_slsh = body.minimumOrderSlsh
  if (body.maxTotalUses !== undefined) updates.max_total_uses = body.maxTotalUses
  if (body.maxUsesPerCustomer !== undefined) updates.max_uses_per_customer = body.maxUsesPerCustomer
  if (body.validFrom !== undefined) updates.valid_from = body.validFrom
  if (body.validUntil !== undefined) updates.valid_until = body.validUntil
  if (body.isActive !== undefined) updates.is_active = body.isActive

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('discount_codes').update(updates).eq('id', params.id).select().single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update discount code' }, { status: 500 })
  }

  return NextResponse.json({ discount: data })
}
