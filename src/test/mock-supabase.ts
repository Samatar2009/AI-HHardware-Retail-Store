import { vi } from 'vitest'

export interface MockResult {
  data: unknown
  error: unknown
}

/**
 * A chainable query-builder stand-in for supabase-js. Every builder method
 * (select/eq/in/ilike/order/limit/insert/update) returns itself, and the
 * chain resolves to `result` whether the caller awaits it directly (as
 * pos-transaction.ts does for bare inserts) or calls `.single()`.
 */
export function chainable(result: MockResult) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: MockResult) => unknown) => resolve(result),
  }
  return chain
}

/**
 * A mock Supabase client whose `.from(table)` returns the next queued
 * chainable response for that table (FIFO) — mirrors calling the same table
 * more than once in a single function (e.g. pos-transaction.ts hits
 * `pos_transactions` twice: once to insert, once to re-fetch with joins).
 */
export function createMockSupabaseClient(queues: Record<string, MockResult[]>) {
  const cursors: Record<string, number> = {}
  return {
    from: vi.fn((table: string) => {
      const i = cursors[table] ?? 0
      cursors[table] = i + 1
      const results = queues[table]
      if (!results || !results[i]) {
        throw new Error(`No mock response queued for table "${table}" call #${i + 1}`)
      }
      return chainable(results[i])
    }),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  }
}
