import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET(request: Request) {
  const { userId, role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const locationIdParam = searchParams.get('location_id')

  let query = supabase
    .from('stocktakes')
    .select('*, location:locations(name_en), initiated_by_profile:profiles!stocktakes_initiated_by_fkey(full_name, phone)')
    .order('created_at', { ascending: false })

  if (role === 'inventory_manager') {
    const { data: profile } = await supabase.from('profiles').select('location_id').eq('user_id', userId).single()
    if (!profile?.location_id) {
      return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
    }
    query = query.eq('location_id', profile.location_id)
  } else if (locationIdParam) {
    query = query.eq('location_id', locationIdParam)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Could not load stocktakes' }, { status: 500 })
  }

  return NextResponse.json({ stocktakes: data })
}

export async function POST(request: Request) {
  const { userId, role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  let locationId: string | null = null

  if (role === 'inventory_manager') {
    const { data: profile } = await supabase.from('profiles').select('location_id').eq('user_id', userId).single()
    locationId = profile?.location_id ?? null
  } else {
    const body = (await request.json().catch(() => ({}))) as { locationId?: string }
    locationId = body.locationId ?? null
  }

  if (!locationId) {
    return NextResponse.json({ error: 'A location must be specified' }, { status: 400 })
  }

  const { data: existingDraft } = await supabase
    .from('stocktakes')
    .select('id')
    .eq('location_id', locationId)
    .eq('status', 'draft')
    .maybeSingle()

  if (existingDraft) {
    return NextResponse.json({ error: 'A draft stocktake already exists for this location' }, { status: 409 })
  }

  const { data: stocktake, error: createError } = await supabase
    .from('stocktakes')
    .insert({ location_id: locationId, status: 'draft', initiated_by: userId })
    .select()
    .single()

  if (createError || !stocktake) {
    return NextResponse.json({ error: 'Could not create stocktake' }, { status: 500 })
  }

  const { data: inventoryRows, error: inventoryError } = await supabase
    .from('inventory')
    .select('product_id, variant_id, quantity_on_hand')
    .eq('location_id', locationId)

  if (inventoryError) {
    return NextResponse.json({ error: 'Could not snapshot inventory' }, { status: 500 })
  }

  if ((inventoryRows ?? []).length > 0) {
    // discrepancy is a generated column (counted_quantity - system_quantity)
    // — must not be written to directly.
    const { error: itemsError } = await supabase.from('stocktake_items').insert(
      (inventoryRows ?? []).map((row) => ({
        stocktake_id: stocktake.id,
        product_id: row.product_id,
        variant_id: row.variant_id,
        system_quantity: row.quantity_on_hand,
        counted_quantity: row.quantity_on_hand,
      }))
    )

    if (itemsError) {
      return NextResponse.json({ error: 'Could not snapshot inventory items' }, { status: 500 })
    }
  }

  return NextResponse.json({ stocktake })
}
