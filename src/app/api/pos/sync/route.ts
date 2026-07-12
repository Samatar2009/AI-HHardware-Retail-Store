import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRole } from '@/lib/require-role'
import { createPosTransaction, transactionSchema } from '@/lib/pos-transaction'

const syncSchema = z.object({
  transactions: z.array(transactionSchema.extend({ localId: z.number() })).min(1),
})

export async function POST(request: Request) {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const parsed = syncSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid sync payload' }, { status: 400 })
  }

  const results: { localId: number; success: boolean; error?: string }[] = []

  // Processed sequentially, not in parallel — each transaction re-checks
  // stock, and a queued offline sale may have depleted inventory that a
  // later queued sale also wanted.
  for (const { localId, ...transactionBody } of parsed.data.transactions) {
    const result = await createPosTransaction(userId, transactionBody)
    results.push({ localId, success: !result.error, error: result.error })
  }

  return NextResponse.json({ results })
}
