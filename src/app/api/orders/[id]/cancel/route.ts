import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  reason: z.enum(['changed_mind', 'found_elsewhere', 'ordered_by_mistake', 'other']),
  otherDetail: z.string().max(200).optional(),
})

const REASON_LABELS: Record<string, string> = {
  changed_mind: 'Changed my mind',
  found_elsewhere: 'Found elsewhere',
  ordered_by_mistake: 'Ordered by mistake',
  other: 'Other',
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please select a cancellation reason' }, { status: 400 })
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, customer_id, status, loyalty_points_redeemed')
    .eq('id', params.id)
    .single()

  if (fetchError || !order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'pending_payment') {
    return NextResponse.json({ error: 'This order can no longer be cancelled' }, { status: 400 })
  }

  const reasonText =
    parsed.data.reason === 'other' && parsed.data.otherDetail
      ? parsed.data.otherDetail
      : REASON_LABELS[parsed.data.reason]

  const admin = createAdminClient()

  // Updating status fires release_reservation (frees the held inventory).
  const { error } = await admin
    .from('orders')
    .update({ status: 'cancelled', cancellation_reason: reasonText })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Could not cancel order' }, { status: 500 })
  }

  // Refund any loyalty points that were redeemed on this order, mirroring
  // the inventory release above (create_order deducted them immediately).
  if (order.loyalty_points_redeemed && order.loyalty_points_redeemed > 0) {
    const { data: card } = await admin
      .from('loyalty_cards')
      .select('id, current_points')
      .eq('customer_id', user.id)
      .single()

    if (card) {
      await admin
        .from('loyalty_cards')
        .update({ current_points: card.current_points + order.loyalty_points_redeemed })
        .eq('id', card.id)

      await admin.from('loyalty_transactions').insert({
        loyalty_card_id: card.id,
        transaction_type: 'adjust',
        points: order.loyalty_points_redeemed,
        reference_type: 'order',
        reference_id: params.id,
        notes: 'Refund for cancelled order',
      })
    }
  }

  return NextResponse.json({ success: true })
}
