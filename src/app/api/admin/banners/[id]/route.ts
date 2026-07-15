import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

const updateBannerSchema = z.object({
  titleEn: z.string().min(1).max(200).optional(),
  titleSo: z.string().min(1).max(200).optional(),
  imageUrl: z.string().url().optional(),
  ctaTextEn: z.string().nullable().optional(),
  ctaTextSo: z.string().nullable().optional(),
  ctaUrl: z.string().nullable().optional(),
  activeFrom: z.string().optional(),
  activeUntil: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = updateBannerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid banner data' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.titleEn !== undefined) updates.title_en = body.titleEn
  if (body.titleSo !== undefined) updates.title_so = body.titleSo
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl
  if (body.ctaTextEn !== undefined) updates.cta_text_en = body.ctaTextEn
  if (body.ctaTextSo !== undefined) updates.cta_text_so = body.ctaTextSo
  if (body.ctaUrl !== undefined) updates.cta_url = body.ctaUrl
  if (body.activeFrom !== undefined) updates.active_from = body.activeFrom
  if (body.activeUntil !== undefined) updates.active_until = body.activeUntil
  if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder
  if (body.isActive !== undefined) updates.is_active = body.isActive

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('banners')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update banner' }, { status: 500 })
  }

  return NextResponse.json({ banner: data })
}
