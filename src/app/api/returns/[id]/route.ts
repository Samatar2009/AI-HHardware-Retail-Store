import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/require-role'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('returns')
    .select(
      '*, customer:profiles!returns_customer_id_fkey(phone, full_name), order:orders(order_number), return_items(*)'
    )
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Return not found' }, { status: 404 })
  }

  return NextResponse.json({ return: data })
}

const patchSchema = z.object({
  approve: z.boolean().optional(),
  reject: z.boolean().optional(),
  refundMethod: z.enum(['original_payment', 'cash', 'store_credit']).optional(),
  refundAmountSlsh: z.number().int().nonnegative().optional(),
  mobileMoneyPhone: z.string().optional(),
  refundReference: z.string().max(100).optional(),
  rejectionReason: z.string().max(500).optional(),
  restock: z.boolean().default(true),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  if (!body.approve && !body.reject) {
    return NextResponse.json({ error: 'Either approve or reject must be set' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: returnRow } = await supabase
    .from('returns')
    .select('*, return_items(*)')
    .eq('id', params.id)
    .single()

  if (!returnRow) {
    return NextResponse.json({ error: 'Return not found' }, { status: 404 })
  }
  if (returnRow.status !== 'pending') {
    return NextResponse.json({ error: 'This return has already been processed' }, { status: 409 })
  }

  const updates: Record<string, unknown> = {
    status: body.approve ? 'approved' : 'rejected',
    processed_by: userId,
    processed_at: new Date().toISOString(),
  }
  if (body.approve) {
    if (!body.refundMethod || body.refundAmountSlsh === undefined) {
      return NextResponse.json(
        { error: 'Refund method and amount are required to approve a return' },
        { status: 400 }
      )
    }
    updates.refund_method = body.refundMethod
    updates.refund_amount_slsh = body.refundAmountSlsh
    updates.mobile_money_phone = body.mobileMoneyPhone ?? null
    updates.refund_reference = body.refundReference ?? null
  } else {
    updates.rejection_reason = body.rejectionReason ?? null
  }

  const { data: updated, error: updateError } = await supabase
    .from('returns')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Could not update return' }, { status: 500 })
  }

  // Only physical, restockable returns put items back into inventory —
  // returns.location_id records where the item is being physically dropped
  // off, and stock_movements/inventory have no RLS write policy for staff,
  // so this goes through the admin client (same pattern as receive stock).
  if (body.approve && body.restock) {
    const admin = createAdminClient()
    for (const item of returnRow.return_items) {
      if (!item.product_id || !item.variant_id) continue

      const { data: inv } = await admin
        .from('inventory')
        .select('quantity_on_hand')
        .eq('product_id', item.product_id)
        .eq('variant_id', item.variant_id)
        .eq('location_id', returnRow.location_id)
        .maybeSingle()

      if (inv) {
        await admin
          .from('inventory')
          .update({ quantity_on_hand: inv.quantity_on_hand + item.quantity })
          .eq('product_id', item.product_id)
          .eq('variant_id', item.variant_id)
          .eq('location_id', returnRow.location_id)
      }

      await admin.from('stock_movements').insert({
        product_id: item.product_id,
        variant_id: item.variant_id,
        location_id: returnRow.location_id,
        movement_type: 'return',
        quantity_change: item.quantity,
        reference_id: returnRow.id,
        reference_type: 'return',
        performed_by: userId,
      })
    }
  }

  return NextResponse.json({ return: updated })
}
