import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase.from('banners').select('*').order('sort_order')

  if (error) {
    return NextResponse.json({ error: 'Could not load banners' }, { status: 500 })
  }

  return NextResponse.json({ banners: data })
}

const createBannerSchema = z.object({
  titleEn: z.string().min(1).max(200),
  titleSo: z.string().min(1).max(200),
  imageUrl: z.string().url(),
  ctaTextEn: z.string().optional(),
  ctaTextSo: z.string().optional(),
  ctaUrl: z.string().optional(),
  scopeType: z.enum(['all', 'location']).default('all'),
  scopeLocationId: z.string().uuid().nullable().optional(),
  activeFrom: z.string(),
  activeUntil: z.string(),
  sortOrder: z.number().int().nonnegative().default(0),
})

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = createBannerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid banner data', details: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('banners')
    .insert({
      title_en: body.titleEn,
      title_so: body.titleSo,
      image_url: body.imageUrl,
      cta_text_en: body.ctaTextEn ?? null,
      cta_text_so: body.ctaTextSo ?? null,
      cta_url: body.ctaUrl ?? null,
      scope_type: body.scopeType,
      scope_location_id: body.scopeLocationId ?? null,
      active_from: body.activeFrom,
      active_until: body.activeUntil,
      sort_order: body.sortOrder,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not create banner' }, { status: 500 })
  }

  return NextResponse.json({ banner: data })
}
