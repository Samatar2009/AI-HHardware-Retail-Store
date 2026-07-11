import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  code: z.string().min(1).max(50),
  orderTotalSlsh: z.number().int().positive(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('check_discount_code_validity', {
    p_code: parsed.data.code,
    p_customer_id: user.id,
    p_order_total: parsed.data.orderTotalSlsh,
  })

  if (error || !data || data.length === 0) {
    return NextResponse.json({ isValid: false, discountAmountSlsh: 0, errorMessage: 'Invalid or expired code' })
  }

  const result = data[0]
  return NextResponse.json({
    isValid: result.is_valid,
    discountAmountSlsh: result.discount_amount_slsh,
    errorMessage: result.error_message,
  })
}
