import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/require-role'
import { geminiPro } from '@/lib/ai'

const bodySchema = z.object({
  nameEn: z.string().min(1),
  nameSo: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().optional(),
  attributes: z.record(z.string()).optional(),
})

const responseSchema = z.object({
  description_en: z.string(),
  description_so: z.string(),
})

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  const prompt = `Write a compelling product description for a hardware store in Borama, Somaliland.
Product: ${body.nameEn} (${body.nameSo}).
Category: ${body.category}.
Brand: ${body.brand ?? 'unbranded'}.
Attributes: ${JSON.stringify(body.attributes ?? {})}.
Return ONLY a JSON object with this exact shape, no markdown fences: { "description_en": string, "description_so": string }.
Keep each description 2-3 sentences. Focus on practical use cases for construction in Somaliland. description_so must be written in Somali.`

  try {
    const result = await geminiPro.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
    const parsedResponse = responseSchema.safeParse(JSON.parse(jsonText))

    if (!parsedResponse.success) {
      return NextResponse.json({ error: 'AI response was malformed' }, { status: 502 })
    }

    return NextResponse.json(parsedResponse.data)
  } catch {
    return NextResponse.json({ error: 'Description generation failed' }, { status: 502 })
  }
}
