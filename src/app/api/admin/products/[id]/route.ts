import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const updateProductSchema = z.object({
  nameEn: z.string().min(1).max(200).optional(),
  nameSo: z.string().min(1).max(200).optional(),
  descriptionEn: z.string().max(2000).nullable().optional(),
  descriptionSo: z.string().max(2000).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().max(100).nullable().optional(),
  unit: z.string().max(20).optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), product_variants(*), product_images(*)')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product: data })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = updateProductSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product data' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.nameEn !== undefined) updates.name_en = body.nameEn
  if (body.nameSo !== undefined) updates.name_so = body.nameSo
  if (body.descriptionEn !== undefined) updates.description_en = body.descriptionEn
  if (body.descriptionSo !== undefined) updates.description_so = body.descriptionSo
  if (body.categoryId !== undefined) updates.category_id = body.categoryId
  if (body.brand !== undefined) updates.brand = body.brand
  if (body.unit !== undefined) updates.unit = body.unit
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.isFeatured !== undefined) updates.is_featured = body.isFeatured
  if (body.isActive !== undefined) updates.is_active = body.isActive

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  // audit_products trigger (fixed in migration 0040) logs this automatically.
  const { data, error } = await supabase.from('products').update(updates).eq('id', params.id).select().single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update product' }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}
