import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // orders has no customer-level UPDATE RLS policy (by design — only staff
  // and admin can write to it directly), so ownership is checked here in
  // application code and the actual write goes through the admin client.
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, customer_id, payment_status, payment_method')
    .eq('id', params.id)
    .single()

  if (fetchError || !order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.payment_method === 'cash_on_pickup') {
    return NextResponse.json({ error: 'This order does not require mobile money confirmation' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('orders').update({ payment_status: 'submitted' }).eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Could not update payment status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
