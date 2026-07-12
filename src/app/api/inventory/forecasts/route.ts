import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/require-role'
import { geminiPro } from '@/lib/ai'

const DATA_PERIOD_DAYS = 90

export async function GET(request: Request) {
  const { userId, role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const locationIdParam = searchParams.get('location_id')

  let query = supabase
    .from('ai_forecasts')
    .select('*, product:products(name_en), variant:product_variants(sku)')
    .order('generated_at', { ascending: false })

  if (role === 'inventory_manager') {
    const { data: profile } = await supabase.from('profiles').select('location_id').eq('user_id', userId).single()
    if (!profile?.location_id) {
      return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
    }
    query = query.eq('location_id', profile.location_id)
  } else if (locationIdParam) {
    query = query.eq('location_id', locationIdParam)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Could not load forecasts' }, { status: 500 })
  }

  return NextResponse.json({ forecasts: data })
}

const forecastRequestSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
})

const forecastResponseSchema = z.object({
  predicted_stockout_date: z.string(),
  recommended_reorder_qty: z.number().int().nonnegative(),
  confidence_score: z.number().min(0).max(1),
  reasoning_text: z.string(),
})

export async function POST(request: Request) {
  const { userId, role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = forecastRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  let locationId = body.locationId ?? null

  if (role === 'inventory_manager') {
    const { data: profile } = await supabase.from('profiles').select('location_id').eq('user_id', userId).single()
    locationId = profile?.location_id ?? null
  }
  if (!locationId) {
    return NextResponse.json({ error: 'A location must be specified' }, { status: 400 })
  }

  const [{ data: product }, { data: inventoryRow }, { data: movements }] = await Promise.all([
    supabase.from('products').select('name_en').eq('id', body.productId).single(),
    supabase
      .from('inventory')
      .select('quantity_on_hand, threshold')
      .eq('product_id', body.productId)
      .eq('variant_id', body.variantId)
      .eq('location_id', locationId)
      .single(),
    supabase
      .from('stock_movements')
      .select('quantity_change, created_at')
      .eq('product_id', body.productId)
      .eq('variant_id', body.variantId)
      .eq('location_id', locationId)
      .eq('movement_type', 'sale')
      .gte('created_at', new Date(Date.now() - DATA_PERIOD_DAYS * 86400000).toISOString()),
  ])

  if (!inventoryRow) {
    return NextResponse.json({ error: 'No inventory record for this product at this location' }, { status: 404 })
  }

  const totalUnitsSold = (movements ?? []).reduce((sum, m) => sum + Math.abs(m.quantity_change), 0)
  const dailyVelocity = totalUnitsSold / DATA_PERIOD_DAYS

  const prompt = `You are an inventory forecasting assistant for a hardware store in Borama, Somaliland.
Product: ${product?.name_en ?? 'Unknown product'}.
Current quantity on hand: ${inventoryRow.quantity_on_hand}.
Reorder threshold: ${inventoryRow.threshold}.
Units sold in the last ${DATA_PERIOD_DAYS} days: ${totalUnitsSold} (average ${dailyVelocity.toFixed(2)} units/day).
Today's date: ${new Date().toISOString().slice(0, 10)}.

Based on this sales velocity, predict when this product will run out of stock and how much should be reordered.
Return ONLY a JSON object with this exact shape, no markdown fences:
{ "predicted_stockout_date": "YYYY-MM-DD", "recommended_reorder_qty": number, "confidence_score": number between 0 and 1, "reasoning_text": string }
If there is little or no sales history, say so in reasoning_text and lower the confidence_score accordingly.`

  try {
    const result = await geminiPro.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
    const forecastParsed = forecastResponseSchema.safeParse(JSON.parse(jsonText))

    if (!forecastParsed.success) {
      return NextResponse.json({ error: 'AI response was malformed' }, { status: 502 })
    }

    const admin = createAdminClient()
    const { data: forecast, error: upsertError } = await admin
      .from('ai_forecasts')
      .upsert(
        {
          product_id: body.productId,
          variant_id: body.variantId,
          location_id: locationId,
          predicted_stockout_date: forecastParsed.data.predicted_stockout_date,
          recommended_reorder_qty: forecastParsed.data.recommended_reorder_qty,
          confidence_score: forecastParsed.data.confidence_score,
          reasoning_text: forecastParsed.data.reasoning_text,
          generated_at: new Date().toISOString(),
          data_period_days: DATA_PERIOD_DAYS,
        },
        { onConflict: 'product_id,variant_id,location_id' }
      )
      .select()
      .single()

    if (upsertError || !forecast) {
      return NextResponse.json({ error: 'Could not save forecast' }, { status: 500 })
    }

    return NextResponse.json({ forecast })
  } catch {
    return NextResponse.json({ error: 'Forecast generation failed' }, { status: 502 })
  }
}
