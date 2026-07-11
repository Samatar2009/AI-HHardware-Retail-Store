import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawLocationId = searchParams.get('location_id')

  if (rawLocationId && !UUID_PATTERN.test(rawLocationId)) {
    return NextResponse.json({ error: 'Invalid location_id' }, { status: 400 })
  }
  const locationId = rawLocationId

  const supabase = await createClient()
  const now = new Date().toISOString()

  let query = supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .lte('active_from', now)
    .gte('active_until', now)
    .order('sort_order', { ascending: true })

  query = locationId ? query.or(`scope_type.eq.all,scope_location_id.eq.${locationId}`) : query.eq('scope_type', 'all')

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Could not load banners' }, { status: 500 })
  }

  return NextResponse.json({ banners: data ?? [] })
}
