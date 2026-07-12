import { NextResponse } from 'next/server'
import Papa from 'papaparse'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET(request: Request) {
  const { error: authError } = await requireRole(['admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const locationId = searchParams.get('location_id')

  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select('order_number, status, payment_method, payment_status, total_slsh, created_at, customer:profiles!orders_customer_id_fkey(phone), location:locations(name_en)')
    .order('created_at', { ascending: false })

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (locationId) query = query.eq('location_id', locationId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Could not export orders' }, { status: 500 })
  }

  const rows = (data ?? []).map((order) => {
    const customer = order.customer as unknown as { phone: string } | null
    const location = order.location as unknown as { name_en: string } | null
    return {
      order_number: order.order_number,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      total_slsh: order.total_slsh,
      customer_phone: customer?.phone ?? '',
      location: location?.name_en ?? '',
      created_at: order.created_at,
    }
  })

  const csv = Papa.unparse(rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
