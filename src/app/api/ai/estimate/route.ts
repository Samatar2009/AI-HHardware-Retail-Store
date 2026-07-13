import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { geminiPro } from '@/lib/ai'
import { rateLimiters } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'

const bodySchema = z.object({
  description: z.string().min(10).max(1000),
  areaSqm: z.number().positive().max(100000).optional(),
  language: z.enum(['en', 'so']).default('en'),
})

const materialSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  unit_price_slsh: z.number().nonnegative(),
  total_slsh: z.number().nonnegative(),
})

const estimateResponseSchema = z.object({
  project_type: z.string(),
  materials: z.array(materialSchema).min(1),
  total_slsh: z.number().nonnegative(),
  notes: z.string(),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimiters.aiEstimate.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { description, areaSqm, language } = parsed.data
  const languageName = language === 'so' ? 'Somali' : 'English'

  const prompt = `You are a construction materials estimator for a hardware store in Borama, Somaliland.
Project description: "${description}"${areaSqm ? `\nArea: ${areaSqm} square meters` : ''}

1. Identify the project type.
2. List the required materials with realistic quantities and current Somaliland market unit prices in SLSH (Somaliland Shilling).
3. Return ONLY a JSON object with this exact shape, no markdown fences:
{ "project_type": string, "materials": [{ "name": string, "quantity": number, "unit": string, "unit_price_slsh": number, "total_slsh": number }], "total_slsh": number, "notes": string }
Write project_type and notes in ${languageName}. Keep the materials list realistic and practical for construction in Somaliland.`

  let aiResult: z.infer<typeof estimateResponseSchema>
  try {
    const result = await geminiPro.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
    const parsedResult = estimateResponseSchema.safeParse(JSON.parse(jsonText))
    if (!parsedResult.success) {
      return NextResponse.json({ error: 'AI response was malformed' }, { status: 502 })
    }
    aiResult = parsedResult.data
  } catch {
    return NextResponse.json({ error: 'Estimate generation failed' }, { status: 502 })
  }

  // Reconcile each AI-suggested material against the real catalog — the
  // model's guessed price is a fallback, not the source of truth, per
  // Build Plan Step 11.2 ("Look up actual prices from products table").
  // Uses pg_trgm similarity (match_product_by_name) rather than a plain
  // ILIKE substring check — the AI's wording ("Portland Cement (50kg
  // bag)") essentially never matches the catalog's exact naming
  // convention ("Portland Cement 50kg Bag") as a literal substring.
  // match_product_by_name is restricted to service_role, so this goes
  // through the admin client (this route has no staff-only auth gate —
  // it's a customer-facing feature — so the regular client wouldn't have
  // execute permission on it anyway).
  const admin = createAdminClient()
  const materialsWithMatches = await Promise.all(
    aiResult.materials.map(async (material) => {
      const { data: nameMatches } = await admin.rpc('match_product_by_name', { search_text: material.name })
      const nameMatch = nameMatches?.[0]
      if (!nameMatch) {
        return {
          ...material,
          matchedProductId: null,
          matchedVariantId: null,
          matchedSku: null,
          matchedNameEn: null,
          matchedNameSo: null,
          matchedImageUrl: null,
        }
      }

      const { data: match } = await admin
        .from('products')
        .select('id, name_en, name_so, product_variants(id, sku, price_slsh, is_active), product_images(image_url, sort_order)')
        .eq('id', nameMatch.product_id)
        .single()

      const activeVariant = (
        match?.product_variants as { id: string; sku: string; price_slsh: number; is_active: boolean }[] | undefined
      )?.find((v) => v.is_active)
      const image = (match?.product_images as { image_url: string; sort_order: number }[] | undefined)?.sort(
        (a, b) => a.sort_order - b.sort_order
      )[0]

      if (match && activeVariant) {
        const totalSlsh = activeVariant.price_slsh * material.quantity
        return {
          ...material,
          unit_price_slsh: activeVariant.price_slsh,
          total_slsh: totalSlsh,
          matchedProductId: match.id,
          matchedVariantId: activeVariant.id,
          matchedSku: activeVariant.sku,
          matchedNameEn: match.name_en,
          matchedNameSo: match.name_so,
          matchedImageUrl: image?.image_url ?? null,
        }
      }

      return {
        ...material,
        matchedProductId: null,
        matchedVariantId: null,
        matchedSku: null,
        matchedNameEn: null,
        matchedNameSo: null,
        matchedImageUrl: null,
      }
    })
  )

  const totalSlsh = materialsWithMatches.reduce((sum, m) => sum + m.total_slsh, 0)

  return NextResponse.json({
    projectType: aiResult.project_type,
    materials: materialsWithMatches,
    totalSlsh,
    notes: aiResult.notes,
  })
}
