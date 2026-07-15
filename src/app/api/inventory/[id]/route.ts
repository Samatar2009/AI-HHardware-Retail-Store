import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

const updateInventorySchema = z.object({
  threshold: z.number().int().nonnegative().optional(),
  aisleShelf: z.string().max(50).nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { userId, role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = updateInventorySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inventory data' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.threshold !== undefined) updates.threshold = body.threshold
  if (body.aisleShelf !== undefined) updates.aisle_shelf = body.aisleShelf

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()

  if (role === 'inventory_manager') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('location_id')
      .eq('user_id', userId)
      .single()
    const { data: row } = await supabase
      .from('inventory')
      .select('location_id')
      .eq('id', params.id)
      .single()
    if (!row || row.location_id !== profile?.location_id) {
      return NextResponse.json({ error: 'Not authorized for this location' }, { status: 403 })
    }
  }

  // The audit_inventory trigger (Phase 1) logs this update automatically.
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update inventory' }, { status: 500 })
  }

  return NextResponse.json({ inventory: data })
}
