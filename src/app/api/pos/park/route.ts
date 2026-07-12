import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parked_transactions')
    .select('*')
    .eq('cashier_id', userId)
    .eq('is_recalled', false)
    .gt('expires_at', new Date().toISOString())
    .order('parked_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Could not load parked carts' }, { status: 500 })
  }

  return NextResponse.json({ parked: data })
}

const parkSchema = z.object({
  posSessionId: z.string().uuid(),
  locationId: z.string().uuid(),
  cartData: z.object({
    items: z.array(
      z.object({
        variantId: z.string().uuid(),
        productId: z.string().uuid(),
        nameEn: z.string(),
        sku: z.string(),
        quantity: z.number().int().positive(),
        unitPriceSlsh: z.number().int().nonnegative(),
      })
    ),
    customerPhone: z.string().nullable().optional(),
    discountCode: z.string().nullable().optional(),
  }),
})

export async function POST(request: Request) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = parkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parked_transactions')
    .insert({
      pos_session_id: body.posSessionId,
      cashier_id: userId,
      location_id: body.locationId,
      cart_data: body.cartData,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not park cart' }, { status: 500 })
  }

  return NextResponse.json({ parked: data })
}
