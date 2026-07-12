import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Full Background Sync API registration (syncing even after the tab is
// closed) is Phase 12's job, per Build Plan Phase 9's own prerequisite note.
// This gives the POS terminal a working offline queue now: writes to
// IndexedDB while offline, and flushes on the browser's 'online' event.

export interface QueuedPosTransaction {
  id?: number
  transactionData: Record<string, unknown>
  queuedAt: string
  status: 'pending' | 'synced' | 'failed'
}

interface PosOfflineSchema extends DBSchema {
  'pos-offline-queue': {
    key: number
    value: QueuedPosTransaction
  }
}

let dbPromise: Promise<IDBPDatabase<PosOfflineSchema>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PosOfflineSchema>('borama-pos-offline', 1, {
      upgrade(db) {
        db.createObjectStore('pos-offline-queue', { keyPath: 'id', autoIncrement: true })
      },
    })
  }
  return dbPromise
}

export async function queueOfflineTransaction(transactionData: Record<string, unknown>): Promise<number> {
  const db = await getDb()
  return db.add('pos-offline-queue', { transactionData, queuedAt: new Date().toISOString(), status: 'pending' })
}

export async function getPendingTransactions(): Promise<QueuedPosTransaction[]> {
  const db = await getDb()
  const all = await db.getAll('pos-offline-queue')
  return all.filter((t) => t.status === 'pending')
}

export async function markTransactionStatus(id: number, status: 'synced' | 'failed'): Promise<void> {
  const db = await getDb()
  const existing = await db.get('pos-offline-queue', id)
  if (existing) {
    await db.put('pos-offline-queue', { ...existing, status })
  }
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingTransactions()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  const res = await fetch('/api/pos/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: pending.map((t) => ({ localId: t.id, ...t.transactionData })) }),
  })

  if (!res.ok) {
    return { synced: 0, failed: pending.length }
  }

  const data = (await res.json()) as { results: { localId: number; success: boolean }[] }
  let synced = 0
  let failed = 0
  for (const result of data.results) {
    await markTransactionStatus(result.localId, result.success ? 'synced' : 'failed')
    if (result.success) synced++
    else failed++
  }
  return { synced, failed }
}
