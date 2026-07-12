import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase.from('loyalty_tiers').select('*').order('min_lifetime_points')

  if (error) {
    return NextResponse.json({ error: 'Could not load loyalty tiers' }, { status: 500 })
  }

  return NextResponse.json({ tiers: data })
}
