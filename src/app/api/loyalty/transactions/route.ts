import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  const { data: card } = await supabase
    .from('loyalty_cards')
    .select('id')
    .eq('customer_id', user.id)
    .maybeSingle()

  if (!card) {
    return NextResponse.json({ transactions: [], totalCount: 0 })
  }

  const from = (page - 1) * limit
  const { data: transactions, count } = await supabase
    .from('loyalty_transactions')
    .select('*', { count: 'exact' })
    .eq('loyalty_card_id', card.id)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  return NextResponse.json({
    transactions: transactions ?? [],
    totalCount: count ?? 0,
    page,
    pageSize: limit,
  })
}
