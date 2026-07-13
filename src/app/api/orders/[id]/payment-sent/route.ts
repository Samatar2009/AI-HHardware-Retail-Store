import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({ transactionReference: z.string().max(100).optional() })

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  const transactionReference = parsed.success ? parsed.data.transactionReference : undefined

  // orders has no customer-level UPDATE RLS policy (by design — only staff
  // and admin can write to it directly), so ownership is checked here in
  // application code and the actual write goes through the admin client.
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, customer_id, status, payment_status, payment_method')
    .eq('id', params.id)
    .single()

  if (fetchError || !order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.payment_method === 'cash_on_pickup') {
    return NextResponse.json({ error: 'This order does not require mobile money confirmation' }, { status: 400 })
  }
  if (order.status !== 'pending_payment') {
    return NextResponse.json({ error: 'Payment has already been reported for this order' }, { status: 409 })
  }

  const admin = createAdminClient()
  // Both fields must move together: payment_status tracks the payment's own
  // state, status is what staff's pending-payments queue (Phase 10) filters
  // on — a customer marking payment sent should always advance both.
  const { error } = await admin
    .from('orders')
    .update({
      status: 'payment_submitted',
      payment_status: 'submitted',
      payment_reference: transactionReference ?? null,
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Could not update payment status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
