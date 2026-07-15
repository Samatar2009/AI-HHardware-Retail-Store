import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const updateCategorySchema = z.object({
  nameEn: z.string().min(1).max(100).optional(),
  nameSo: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['admin'])
  if (authError) return authError

  const parsed = updateCategorySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid category data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()

  if (body.parentId !== undefined && body.parentId !== null) {
    if (body.parentId === params.id) {
      return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 })
    }

    const { data: allCategories } = await supabase.from('categories').select('id, parent_id')
    const byId = new Map((allCategories ?? []).map((c) => [c.id, c.parent_id]))

    let ancestor: string | null = body.parentId
    while (ancestor) {
      if (ancestor === params.id) {
        return NextResponse.json(
          { error: 'Circular category reference not allowed' },
          { status: 400 }
        )
      }
      ancestor = byId.get(ancestor) ?? null
    }
  }

  const updates: Record<string, unknown> = {}
  if (body.nameEn !== undefined) updates.name_en = body.nameEn
  if (body.nameSo !== undefined) updates.name_so = body.nameSo
  if (body.parentId !== undefined) updates.parent_id = body.parentId
  if (body.iconUrl !== undefined) updates.icon_url = body.iconUrl
  if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder
  if (body.isActive !== undefined) updates.is_active = body.isActive

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: category, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error || !category) {
    return NextResponse.json({ error: 'Could not update category' }, { status: 500 })
  }

  return NextResponse.json({ category })
}
