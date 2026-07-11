import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  locationId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().nullable(),
      quantity: z.number().int().positive(),
    })
  ),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { locationId, items } = parsed.data

  const supabase = await createClient()

  const results = await Promise.all(
    items.map(async (item) => {
      let query = supabase
        .from('inventory')
        .select('quantity_on_hand, quantity_reserved')
        .eq('product_id', item.productId)
        .eq('location_id', locationId)

      query = item.variantId ? query.eq('variant_id', item.variantId) : query.is('variant_id', null)

      const { data } = await query.maybeSingle()
      const availableQty = data ? data.quantity_on_hand - data.quantity_reserved : 0

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        availableQty,
        isAvailable: availableQty >= item.quantity,
      }
    })
  )

  return NextResponse.json({ items: results, allAvailable: results.every((r) => r.isAvailable) })
}
