import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select('*, location_hours(*)')
    .eq('is_active', true)
    .order('name_en')

  if (error) {
    return NextResponse.json({ error: 'Could not load locations' }, { status: 500 })
  }

  return NextResponse.json({ locations: data ?? [] })
}
