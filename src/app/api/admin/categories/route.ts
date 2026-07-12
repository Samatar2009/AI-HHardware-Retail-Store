import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')

  if (error) {
    return NextResponse.json({ error: 'Could not load categories' }, { status: 500 })
  }

  return NextResponse.json({ categories: data })
}

const createCategorySchema = z.object({
  nameEn: z.string().min(1).max(100),
  nameSo: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
})

export async function POST(request: Request) {
  const { error: authError } = await requireRole(['admin'])
  if (authError) return authError

  const parsed = createCategorySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid category data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()

  if (body.parentId) {
    const { data: parent } = await supabase.from('categories').select('id').eq('id', body.parentId).single()
    if (!parent) {
      return NextResponse.json({ error: 'Parent category does not exist' }, { status: 400 })
    }
  }

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      name_en: body.nameEn,
      name_so: body.nameSo,
      parent_id: body.parentId ?? null,
      icon_url: body.iconUrl ?? null,
      sort_order: body.sortOrder,
    })
    .select()
    .single()

  if (error || !category) {
    return NextResponse.json({ error: 'Could not create category' }, { status: 500 })
  }

  return NextResponse.json({ category })
}
