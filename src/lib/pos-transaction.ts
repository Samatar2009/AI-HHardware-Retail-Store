import 'server-only'

import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const paymentSchema = z.object({
  method: z.enum(['cash', 'zaad', 'edahab', 'evc_plus', 'sahal']),
  amountSlsh: z.number().int().positive(),
  changeSlsh: z.number().int().nonnegative().default(0),
  transactionReference: z.string().max(100).optional(),
})

export const transactionSchema = z.object({
  posSessionId: z.string().uuid(),
  locationId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  customerPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  discountCode: z.string().optional(),
  payments: z.array(paymentSchema).min(1),
})

export type CreatePosTransactionInput = z.infer<typeof transactionSchema>

export interface CreatePosTransactionResult {
  status: number
  error?: string
  transaction?: unknown
}

/** Shared by POST /api/pos/transactions (online) and POST /api/pos/sync
 * (replaying transactions queued while offline) — same validation and
 * side effects either way. */
export async function createPosTransaction(userId: string, body: CreatePosTransactionInput): Promise<CreatePosTransactionResult> {
  const supabase = await createClient()

  const { data: session } = await supabase.from('pos_sessions').select('id, status, cashier_id').eq('id', body.posSessionId).single()
  if (!session || session.status !== 'open' || session.cashier_id !== userId) {
    return { status: 409, error: 'No matching open session' }
  }

  if (body.discountCode && !body.customerId) {
    return { status: 400, error: 'A customer must be linked to apply a discount code' }
  }

  const variantIds = body.items.map((i) => i.variantId)
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, sku, price_slsh, product:products(name_en)')
    .in('id', variantIds)

  const variantMap = new Map((variants ?? []).map((v) => [v.id, v]))
  let subtotal = 0
  const enrichedItems: {
    productId: string
    variantId: string
    sku: string
    nameEn: string
    quantity: number
    unitPriceSlsh: number
    totalPriceSlsh: number
  }[] = []

  for (const item of body.items) {
    const variant = variantMap.get(item.variantId)
    if (!variant) {
      return { status: 409, error: 'One or more items are no longer available' }
    }
    const product = variant.product as unknown as { name_en: string } | null
    const totalPriceSlsh = variant.price_slsh * item.quantity
    subtotal += totalPriceSlsh
    enrichedItems.push({
      productId: item.productId,
      variantId: item.variantId,
      sku: variant.sku,
      nameEn: product?.name_en ?? '',
      quantity: item.quantity,
      unitPriceSlsh: variant.price_slsh,
      totalPriceSlsh,
    })
  }

  const { data: inventoryRows } = await supabase
    .from('inventory')
    .select('product_id, variant_id, quantity_on_hand, quantity_reserved')
    .eq('location_id', body.locationId)
    .in('variant_id', variantIds)

  for (const item of enrichedItems) {
    const inv = (inventoryRows ?? []).find((i) => i.variant_id === item.variantId)
    const available = inv ? inv.quantity_on_hand - inv.quantity_reserved : 0
    if (available < item.quantity) {
      return { status: 409, error: `Insufficient stock for ${item.nameEn}` }
    }
  }

  let discountAmount = 0
  let discountCodeId: string | null = null

  if (body.discountCode && body.customerId) {
    const { data: validity } = await supabase.rpc('check_discount_code_validity', {
      p_code: body.discountCode,
      p_customer_id: body.customerId,
      p_order_total: subtotal,
    })
    const result = validity?.[0]
    if (!result?.is_valid) {
      return { status: 400, error: result?.error_message ?? 'Invalid discount code' }
    }
    discountAmount = result.discount_amount_slsh
    const { data: code } = await supabase.from('discount_codes').select('id').ilike('code', body.discountCode).single()
    discountCodeId = code?.id ?? null
  }

  const total = Math.max(0, subtotal - discountAmount)
  const paidTotal = body.payments.reduce((sum, p) => sum + p.amountSlsh - p.changeSlsh, 0)
  if (paidTotal < total) {
    return { status: 400, error: 'Payment total does not cover the sale total' }
  }

  const { data: rateRow } = await supabase
    .from('exchange_rates')
    .select('usd_to_slsh_rate')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: transaction, error: txnError } = await supabase
    .from('pos_transactions')
    .insert({
      // Left null on purpose: trg_set_pos_transaction_number only fills it in
      // when NULL, but the generated Insert type doesn't know about that
      // BEFORE INSERT trigger default and marks the column required.
      transaction_number: null as unknown as string,
      pos_session_id: body.posSessionId,
      location_id: body.locationId,
      cashier_id: userId,
      customer_id: body.customerId ?? null,
      customer_phone: body.customerPhone ?? null,
      subtotal_slsh: subtotal,
      discount_amount_slsh: discountAmount,
      total_slsh: total,
      discount_code_id: discountCodeId,
      exchange_rate_at_sale: rateRow?.usd_to_slsh_rate ?? 1,
    })
    .select()
    .single()

  if (txnError || !transaction) {
    return { status: 500, error: 'Could not create transaction' }
  }

  const { error: itemsError } = await supabase.from('pos_transaction_items').insert(
    enrichedItems.map((item) => ({
      pos_transaction_id: transaction.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name_en: item.nameEn,
      sku: item.sku,
      quantity: item.quantity,
      unit_price_slsh: item.unitPriceSlsh,
      total_price_slsh: item.totalPriceSlsh,
    }))
  )

  if (itemsError) {
    return { status: 500, error: 'Could not save transaction items' }
  }

  const { error: splitsError } = await supabase.from('pos_payment_splits').insert(
    body.payments.map((p) => ({
      pos_transaction_id: transaction.id,
      payment_method: p.method,
      amount_slsh: p.amountSlsh,
      change_slsh: p.changeSlsh,
      transaction_reference: p.transactionReference ?? null,
      is_confirmed: p.method === 'cash',
    }))
  )

  if (splitsError) {
    return { status: 500, error: 'Could not save payment' }
  }

  const admin = createAdminClient()

  for (const item of enrichedItems) {
    const inv = (inventoryRows ?? []).find((i) => i.variant_id === item.variantId)
    if (inv) {
      await admin
        .from('inventory')
        .update({ quantity_on_hand: inv.quantity_on_hand - item.quantity })
        .eq('product_id', item.productId)
        .eq('variant_id', item.variantId)
        .eq('location_id', body.locationId)
    }

    await admin.from('stock_movements').insert({
      product_id: item.productId,
      variant_id: item.variantId,
      location_id: body.locationId,
      movement_type: 'sale',
      quantity_change: -item.quantity,
      reference_id: transaction.id,
      reference_type: 'pos_transaction',
      performed_by: userId,
    })
  }

  if (discountCodeId && body.customerId) {
    const { data: currentCode } = await admin.from('discount_codes').select('uses_count').eq('id', discountCodeId).single()
    if (currentCode) {
      await admin.from('discount_codes').update({ uses_count: currentCode.uses_count + 1 }).eq('id', discountCodeId)
    }
    await admin.from('discount_code_uses').insert({
      discount_code_id: discountCodeId,
      customer_id: body.customerId,
      pos_transaction_id: transaction.id,
    })
  }

  const { data: fullTransaction } = await supabase
    .from('pos_transactions')
    .select('*, pos_transaction_items(*), pos_payment_splits(*)')
    .eq('id', transaction.id)
    .single()

  return { status: 200, transaction: fullTransaction }
}
