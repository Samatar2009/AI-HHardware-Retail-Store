import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: card, error } = await supabase.from('loyalty_cards').select('*').eq('customer_id', user.id).maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Could not load loyalty card' }, { status: 500 })
  }

  if (!card) {
    return NextResponse.json({ card: null })
  }

  const { data: tiers } = await supabase.from('loyalty_tiers').select('*').order('min_lifetime_points')
  const currentTier = (tiers ?? []).find((t) => t.tier_name === card.current_tier) ?? null
  const nextTier = (tiers ?? []).find((t) => t.min_lifetime_points > card.lifetime_points) ?? null

  return NextResponse.json({ card, currentTier, tiers: tiers ?? [], nextTier })
}
