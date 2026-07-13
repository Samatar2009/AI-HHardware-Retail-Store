// Custom service worker addition. next-pwa's customWorkerDir mechanism builds
// this file with webpack (target: webworker) and importScripts()s it into the
// Workbox-generated sw.js (see node_modules/next-pwa/build-custom-worker.js) —
// this augments the generated service worker rather than replacing it.
//
// Registers a Background Sync handler for the POS offline queue as a
// progressive enhancement on top of the 'online' event listener in
// src/components/layout/pos-layout.tsx, which already syncs in every browser.
// Background Sync only exists in Chromium browsers (no Safari/iOS, dropped by
// Firefox), but where it exists it can flush the queue even after the POS tab
// is closed. DB name, store name, and the /api/pos/sync payload shape below
// must stay in sync with src/lib/offline-queue.ts.
const DB_NAME = 'borama-pos-offline'
const STORE_NAME = 'pos-offline-queue'

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getPendingTransactions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result.filter((t) => t.status === 'pending'))
    req.onerror = () => reject(req.error)
  })
}

function markTransactionStatus(db, id, status) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const existing = getReq.result
      if (!existing) return resolve(undefined)
      const putReq = store.put({ ...existing, status })
      putReq.onsuccess = () => resolve(undefined)
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

async function syncPosQueue() {
  const db = await openQueueDb()
  const pending = await getPendingTransactions(db)
  if (pending.length === 0) return

  const res = await fetch('/api/pos/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions: pending.map((t) => ({ localId: t.id, ...t.transactionData })),
    }),
  })
  if (!res.ok) return

  const data = await res.json()
  for (const result of data.results) {
    await markTransactionStatus(db, result.localId, result.success ? 'synced' : 'failed')
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'pos-sync') {
    event.waitUntil(syncPosQueue())
  }
})
