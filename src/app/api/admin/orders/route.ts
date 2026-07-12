import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET(request: Request) {
  const { error: authError } = await requireRole(['admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const locationId = searchParams.get('location_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select('*, customer:profiles!orders_customer_id_fkey(phone, full_name), location:locations(name_en)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (locationId) query = query.eq('location_id', locationId)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Could not load orders' }, { status: 500 })
  }

  return NextResponse.json({ orders: data })
}
