import { NextResponse } from 'next/server'

import { requireRole } from '@/lib/require-role'
import { createPosTransaction, transactionSchema } from '@/lib/pos-transaction'

export async function POST(request: Request) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = transactionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid transaction data', details: parsed.error.flatten() }, { status: 400 })
  }

  const result = await createPosTransaction(userId, parsed.data)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ transaction: result.transaction })
}
