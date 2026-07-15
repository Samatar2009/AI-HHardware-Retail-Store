import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, location:locations(name_en)')
    .neq('role', 'customer')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Could not load staff' }, { status: 500 })
  }

  return NextResponse.json({ staff: data })
}

const assignRoleSchema = z.object({
  phone: z.string().min(1),
  role: z.enum(['cashier', 'inventory_manager', 'admin']),
  locationId: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = assignRoleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id, role')
    .eq('phone', body.phone)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json(
      {
        error:
          'No account found for this phone number. The user must sign in at least once before being assigned a staff role.',
      },
      { status: 404 }
    )
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ role: body.role, location_id: body.locationId ?? null })
    .eq('user_id', existing.user_id)
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: 'Could not assign role' }, { status: 500 })
  }

  return NextResponse.json({ profile: updated })
}
