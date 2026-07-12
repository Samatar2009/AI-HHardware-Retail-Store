import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const addImageSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  altTextEn: z.string().optional(),
  altTextSo: z.string().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = addImageSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data: product } = await supabase.from('products').select('id').eq('id', params.id).single()
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const { data: image, error } = await supabase
    .from('product_images')
    .insert({
      product_id: params.id,
      image_url: body.imageUrl,
      thumbnail_url: body.thumbnailUrl,
      alt_text_en: body.altTextEn ?? null,
      alt_text_so: body.altTextSo ?? null,
      sort_order: body.sortOrder,
    })
    .select()
    .single()

  if (error || !image) {
    return NextResponse.json({ error: 'Could not save image' }, { status: 500 })
  }

  return NextResponse.json({ image })
}

const reorderSchema = z.object({
  images: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().nonnegative() })).min(1),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reorder data' }, { status: 400 })
  }

  const supabase = await createClient()
  const results = await Promise.all(
    parsed.data.images.map(({ id, sortOrder }) =>
      supabase.from('product_images').update({ sort_order: sortOrder }).eq('id', id).eq('product_id', params.id)
    )
  )

  if (results.some((r) => r.error)) {
    return NextResponse.json({ error: 'Could not reorder images' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
