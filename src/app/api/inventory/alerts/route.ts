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
    .from('inventory_alerts')
    .select('*, product:products(name_en), variant:product_variants(sku)')
    .eq('is_resolved', false)
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
    return NextResponse.json({ error: 'Could not load alerts' }, { status: 500 })
  }

  return NextResponse.json({ alerts: data })
}
