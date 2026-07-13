// Weekly inventory reorder forecast job (Build Plan Phase 11 Step 11.5).
// Triggered by pg_cron every Sunday at midnight via pg_net (see migration
// 0046_weekly_forecast_cron.sql). Not reachable from the public internet in
// dev — this only starts actually running once deployed and scheduled.
//
// Requires the GEMINI_API_KEY secret to be set on this function
// (`supabase secrets set GEMINI_API_KEY=...` or via the Dashboard's Edge
// Functions > Secrets page) — that's the one step this deploy can't do on
// its own. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically to every Edge Function.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const DATA_PERIOD_DAYS = 30
// See src/lib/ai.ts for why this uses the "-latest" alias rather than a
// pinned dated model name (gemini-2.5-pro was retired mid-project).
const GEMINI_MODEL = 'gemini-pro-latest'

interface ForecastResponse {
  predicted_stockout_date: string
  recommended_reorder_qty: number
  confidence_score: number
  reasoning_text: string
}

Deno.serve(async () => {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret is not configured on this function' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const since = new Date(Date.now() - DATA_PERIOD_DAYS * 86400000).toISOString()
  const { data: movements, error: movementsError } = await supabase
    .from('stock_movements')
    .select('product_id, variant_id, location_id, quantity_change')
    .eq('movement_type', 'sale')
    .gte('created_at', since)

  if (movementsError) {
    return new Response(JSON.stringify({ error: movementsError.message }), { status: 500 })
  }

  // Group by product/variant/location so each combo gets exactly one
  // forecast call, matching ai_forecasts' unique constraint.
  const combos = new Map<string, { productId: string; variantId: string; locationId: string; totalSold: number }>()
  for (const m of movements ?? []) {
    if (!m.product_id || !m.variant_id) continue
    const key = `${m.product_id}:${m.variant_id}:${m.location_id}`
    const entry = combos.get(key) ?? { productId: m.product_id, variantId: m.variant_id, locationId: m.location_id, totalSold: 0 }
    entry.totalSold += Math.abs(m.quantity_change)
    combos.set(key, entry)
  }

  let succeeded = 0
  let failed = 0

  for (const combo of combos.values()) {
    try {
      const [{ data: product }, { data: inventoryRow }] = await Promise.all([
        supabase.from('products').select('name_en').eq('id', combo.productId).single(),
        supabase
          .from('inventory')
          .select('quantity_on_hand, threshold')
          .eq('product_id', combo.productId)
          .eq('variant_id', combo.variantId)
          .eq('location_id', combo.locationId)
          .single(),
      ])

      if (!inventoryRow) {
        failed++
        continue
      }

      const dailyVelocity = combo.totalSold / DATA_PERIOD_DAYS
      const prompt = `You are an inventory forecasting assistant for a hardware store in Borama, Somaliland.
Product: ${product?.name_en ?? 'Unknown product'}.
Current quantity on hand: ${inventoryRow.quantity_on_hand}.
Reorder threshold: ${inventoryRow.threshold}.
Units sold in the last ${DATA_PERIOD_DAYS} days: ${combo.totalSold} (average ${dailyVelocity.toFixed(2)} units/day).
Today's date: ${new Date().toISOString().slice(0, 10)}.

Based on this sales velocity, predict when this product will run out of stock and how much should be reordered.
Return ONLY a JSON object with this exact shape, no markdown fences:
{ "predicted_stockout_date": "YYYY-MM-DD", "recommended_reorder_qty": number, "confidence_score": number between 0 and 1, "reasoning_text": string }`

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        }
      )

      if (!geminiRes.ok) {
        failed++
        continue
      }

      const geminiJson = await geminiRes.json()
      const text: string = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
      const forecast = JSON.parse(cleaned) as ForecastResponse

      const { error: upsertError } = await supabase.from('ai_forecasts').upsert(
        {
          product_id: combo.productId,
          variant_id: combo.variantId,
          location_id: combo.locationId,
          predicted_stockout_date: forecast.predicted_stockout_date,
          recommended_reorder_qty: forecast.recommended_reorder_qty,
          confidence_score: forecast.confidence_score,
          reasoning_text: forecast.reasoning_text,
          generated_at: new Date().toISOString(),
          data_period_days: DATA_PERIOD_DAYS,
        },
        { onConflict: 'product_id,variant_id,location_id' }
      )

      if (upsertError) {
        failed++
      } else {
        succeeded++
      }
    } catch {
      failed++
    }
  }

  return new Response(JSON.stringify({ combosProcessed: combos.size, succeeded, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
