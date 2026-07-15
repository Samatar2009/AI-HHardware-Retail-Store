import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Could not load discount codes' }, { status: 500 })
  }

  return NextResponse.json({ discounts: data })
}

const createDiscountSchema = z.object({
  code: z.string().min(3).max(30),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minimumOrderSlsh: z.number().int().nonnegative().default(0),
  maxTotalUses: z.number().int().positive().nullable().optional(),
  maxUsesPerCustomer: z.number().int().positive().default(1),
  validFrom: z.string(),
  validUntil: z.string(),
})

export async function POST(request: Request) {
  const { userId, error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = createDiscountSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid discount data', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      code: body.code.toUpperCase(),
      discount_type: body.discountType,
      value: body.value,
      minimum_order_slsh: body.minimumOrderSlsh,
      max_total_uses: body.maxTotalUses ?? null,
      max_uses_per_customer: body.maxUsesPerCustomer,
      valid_from: body.validFrom,
      valid_until: body.validUntil,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Could not create discount code (it may already exist)' },
      { status: 500 }
    )
  }

  return NextResponse.json({ discount: data })
}
