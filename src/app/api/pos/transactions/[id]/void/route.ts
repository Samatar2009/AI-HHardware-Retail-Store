import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/require-role'

const voidSchema = z.object({ voidReason: z.string().min(3).max(500) })

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // Voiding is restricted to admin/inventory_manager — this mirrors the
  // pos_transactions_void_staff RLS policy, which a plain cashier can't
  // satisfy. In practice this is the "manager PIN" requirement: a manager
  // must be the one authenticated and performing the void.
  const { userId, error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = voidSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'A void reason is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: transaction } = await supabase
    .from('pos_transactions')
    .select('*, pos_transaction_items(*)')
    .eq('id', params.id)
    .single()

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  if (transaction.status !== 'completed') {
    return NextResponse.json(
      { error: 'Only completed transactions can be voided' },
      { status: 409 }
    )
  }

  const { error: updateError } = await supabase
    .from('pos_transactions')
    .update({
      status: 'voided',
      void_reason: parsed.data.voidReason,
      voided_by: userId,
      voided_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (updateError) {
    return NextResponse.json({ error: 'Could not void transaction' }, { status: 500 })
  }

  const admin = createAdminClient()

  for (const item of transaction.pos_transaction_items) {
    if (!item.product_id || !item.variant_id) continue

    const { data: inv } = await admin
      .from('inventory')
      .select('quantity_on_hand')
      .eq('product_id', item.product_id)
      .eq('variant_id', item.variant_id)
      .eq('location_id', transaction.location_id)
      .maybeSingle()

    if (inv) {
      await admin
        .from('inventory')
        .update({ quantity_on_hand: inv.quantity_on_hand + item.quantity })
        .eq('product_id', item.product_id)
        .eq('variant_id', item.variant_id)
        .eq('location_id', transaction.location_id)
    }

    await admin.from('stock_movements').insert({
      product_id: item.product_id,
      variant_id: item.variant_id,
      location_id: transaction.location_id,
      movement_type: 'void',
      quantity_change: item.quantity,
      reference_id: transaction.id,
      reference_type: 'pos_transaction',
      performed_by: userId,
    })
  }

  if (transaction.loyalty_points_earned > 0 && transaction.customer_id) {
    const { data: card } = await admin
      .from('loyalty_cards')
      .select('id, current_points, lifetime_points')
      .eq('customer_id', transaction.customer_id)
      .maybeSingle()
    if (card) {
      await admin
        .from('loyalty_cards')
        .update({
          current_points: Math.max(0, card.current_points - transaction.loyalty_points_earned),
          lifetime_points: Math.max(0, card.lifetime_points - transaction.loyalty_points_earned),
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id)

      await admin.from('loyalty_transactions').insert({
        loyalty_card_id: card.id,
        transaction_type: 'adjust',
        points: -transaction.loyalty_points_earned,
        reference_type: 'pos_transaction_void',
        reference_id: transaction.id,
      })
    }
  }

  return NextResponse.json({ success: true })
}
