import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stocktakes')
    .select(
      '*, location:locations(name_en), initiated_by_profile:profiles!stocktakes_initiated_by_fkey(full_name, phone), approved_by_profile:profiles!stocktakes_approved_by_fkey(full_name), stocktake_items(*, product:products(name_en, sku_base), variant:product_variants(sku))'
    )
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Stocktake not found' }, { status: 404 })
  }

  return NextResponse.json({ stocktake: data })
}

const patchSchema = z.object({
  items: z.array(z.object({ itemId: z.string().uuid(), countedQuantity: z.number().int().nonnegative() })).optional(),
  submit: z.boolean().optional(),
  approve: z.boolean().optional(),
  reject: z.boolean().optional(),
  rejectionReason: z.string().max(500).optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  const supabase = await createClient()

  const { data: stocktake } = await supabase.from('stocktakes').select('id, status').eq('id', params.id).single()
  if (!stocktake) {
    return NextResponse.json({ error: 'Stocktake not found' }, { status: 404 })
  }

  if (body.items && body.items.length > 0) {
    if (stocktake.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft stocktakes can be edited' }, { status: 409 })
    }

    for (const item of body.items) {
      // discrepancy is a generated column (counted_quantity - system_quantity)
      // — the DB recomputes it automatically, so only counted_quantity is set here.
      const { error } = await supabase
        .from('stocktake_items')
        .update({ counted_quantity: item.countedQuantity })
        .eq('id', item.itemId)

      if (error) {
        return NextResponse.json({ error: 'Could not update stocktake items' }, { status: 500 })
      }
    }
  }

  if (body.submit) {
    if (stocktake.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft stocktakes can be submitted' }, { status: 409 })
    }
    const { error } = await supabase
      .from('stocktakes')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'Could not submit stocktake' }, { status: 500 })
    }
  }

  if (body.approve || body.reject) {
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Only an admin can approve or reject a stocktake' }, { status: 403 })
    }
    if (stocktake.status !== 'submitted') {
      return NextResponse.json({ error: 'Only submitted stocktakes can be approved or rejected' }, { status: 409 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Applying corrections and creating stock_movements on approval is
    // handled by the trg_apply_stocktake trigger (Phase 1).
    const { error } = await supabase
      .from('stocktakes')
      .update({
        status: body.approve ? 'approved' : 'rejected',
        approved_by: user!.id,
        approved_at: new Date().toISOString(),
        rejection_reason: body.reject ? (body.rejectionReason ?? null) : null,
      })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'Could not update stocktake status' }, { status: 500 })
    }
  }

  const { data: updated } = await supabase
    .from('stocktakes')
    .select('*, stocktake_items(*, product:products(name_en, sku_base), variant:product_variants(sku))')
    .eq('id', params.id)
    .single()

  return NextResponse.json({ stocktake: updated })
}
