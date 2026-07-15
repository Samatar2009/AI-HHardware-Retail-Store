import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

const updateStaffSchema = z.object({
  role: z.enum(['customer', 'cashier', 'inventory_manager', 'admin']).optional(),
  locationId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = updateStaffSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.role !== undefined) updates.role = body.role
  if (body.locationId !== undefined) updates.location_id = body.locationId
  if (body.isActive !== undefined) updates.is_active = body.isActive

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update staff member' }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
