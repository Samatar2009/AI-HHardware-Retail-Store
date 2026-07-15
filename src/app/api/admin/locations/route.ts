import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireRole } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireRole(['admin', 'cashier', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('*, location_hours(*)')
    .order('name_en')

  if (error) {
    return NextResponse.json({ error: 'Could not load locations' }, { status: 500 })
  }

  return NextResponse.json({ locations: data })
}

const createLocationSchema = z.object({
  nameEn: z.string().min(1).max(100),
  nameSo: z.string().min(1).max(100),
  address: z.string().min(1),
  phone: z.string().optional(),
})

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = createLocationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid location data' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()
  const { data: location, error } = await supabase
    .from('locations')
    .insert({
      name_en: body.nameEn,
      name_so: body.nameSo,
      address: body.address,
      phone: body.phone ?? null,
    })
    .select()
    .single()

  if (error || !location) {
    return NextResponse.json({ error: 'Could not create location' }, { status: 500 })
  }

  return NextResponse.json({ location })
}
