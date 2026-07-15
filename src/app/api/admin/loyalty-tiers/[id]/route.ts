import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

const updateTierSchema = z.object({
  minLifetimePoints: z.number().int().nonnegative().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { userId, error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = updateTierSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tier data' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }
  if (body.minLifetimePoints !== undefined) updates.min_lifetime_points = body.minLifetimePoints
  if (body.discountPercentage !== undefined) updates.discount_percentage = body.discountPercentage

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('loyalty_tiers')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update tier' }, { status: 500 })
  }

  return NextResponse.json({ tier: data })
}
