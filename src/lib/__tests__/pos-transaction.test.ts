import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPosTransaction, type CreatePosTransactionInput } from '@/lib/pos-transaction'
import { createMockSupabaseClient } from '@/test/mock-supabase'

const CASHIER_ID = 'cashier-1'
const SESSION_ID = '00000000-0000-0000-0000-00000000000a'
const LOCATION_ID = '00000000-0000-0000-0000-00000000000b'
const PRODUCT_ID = '00000000-0000-0000-0000-00000000000c'
const VARIANT_ID = '00000000-0000-0000-0000-00000000000d'

function baseInput(overrides: Partial<CreatePosTransactionInput> = {}): CreatePosTransactionInput {
  return {
    posSessionId: SESSION_ID,
    locationId: LOCATION_ID,
    items: [{ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 2 }],
    payments: [{ method: 'cash', amountSlsh: 20000, changeSlsh: 0 }],
    ...overrides,
  }
}

/** Wires up the standard happy-path table responses for `supabase` (the
 * regular client), with per-test overrides for specific tables. */
function mockSupabaseTables(overrides: Record<string, { data: unknown; error: unknown }[]> = {}) {
  const client = createMockSupabaseClient({
    pos_sessions: [
      { data: { id: SESSION_ID, status: 'open', cashier_id: CASHIER_ID }, error: null },
    ],
    product_variants: [
      {
        data: [
          { id: VARIANT_ID, sku: 'SKU-1', price_slsh: 10000, product: { name_en: 'Claw Hammer' } },
        ],
        error: null,
      },
    ],
    inventory: [
      {
        data: [
          {
            product_id: PRODUCT_ID,
            variant_id: VARIANT_ID,
            quantity_on_hand: 10,
            quantity_reserved: 0,
          },
        ],
        error: null,
      },
    ],
    exchange_rates: [{ data: { usd_to_slsh_rate: 570 }, error: null }],
    pos_transactions: [
      { data: { id: 'txn-1', transaction_number: 'POS-0001' }, error: null },
      {
        data: {
          id: 'txn-1',
          transaction_number: 'POS-0001',
          pos_transaction_items: [],
          pos_payment_splits: [],
        },
        error: null,
      },
    ],
    pos_transaction_items: [{ data: null, error: null }],
    pos_payment_splits: [{ data: null, error: null }],
    ...overrides,
  })
  vi.mocked(createClient).mockResolvedValue(client as never)
  return client
}

function mockAdminClient() {
  const admin = createMockSupabaseClient({
    inventory: [{ data: null, error: null }],
    stock_movements: [{ data: null, error: null }],
  })
  vi.mocked(createAdminClient).mockReturnValue(admin as never)
  return admin
}

describe('createPosTransaction', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(createAdminClient).mockReset()
  })

  it('rejects when there is no matching open session', async () => {
    const client = createMockSupabaseClient({
      pos_sessions: [
        { data: { id: SESSION_ID, status: 'closed', cashier_id: CASHIER_ID }, error: null },
      ],
    })
    vi.mocked(createClient).mockResolvedValue(client as never)
    mockAdminClient()

    const result = await createPosTransaction(CASHIER_ID, baseInput())
    expect(result.status).toBe(409)
    expect(result.error).toBe('No matching open session')
  })

  it('rejects when the session belongs to a different cashier', async () => {
    const client = createMockSupabaseClient({
      pos_sessions: [
        { data: { id: SESSION_ID, status: 'open', cashier_id: 'someone-else' }, error: null },
      ],
    })
    vi.mocked(createClient).mockResolvedValue(client as never)
    mockAdminClient()

    const result = await createPosTransaction(CASHIER_ID, baseInput())
    expect(result.status).toBe(409)
  })

  it('rejects when requested quantity exceeds available stock', async () => {
    mockSupabaseTables({
      inventory: [
        {
          data: [
            {
              product_id: PRODUCT_ID,
              variant_id: VARIANT_ID,
              quantity_on_hand: 1,
              quantity_reserved: 0,
            },
          ],
          error: null,
        },
      ],
    })
    mockAdminClient()

    const result = await createPosTransaction(
      CASHIER_ID,
      baseInput({ items: [{ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 2 }] })
    )
    expect(result.status).toBe(409)
    expect(result.error).toContain('Insufficient stock')
  })

  it('rejects when the tendered payment total is less than the sale total', async () => {
    mockSupabaseTables()
    mockAdminClient()

    // 2 x 10,000 SLSH = 20,000 SLSH total, but only 15,000 tendered.
    const result = await createPosTransaction(
      CASHIER_ID,
      baseInput({ payments: [{ method: 'cash', amountSlsh: 15000, changeSlsh: 0 }] })
    )
    expect(result.status).toBe(400)
    expect(result.error).toBe('Payment total does not cover the sale total')
  })

  it('decrements inventory and records a sale stock movement on success', async () => {
    mockSupabaseTables()
    const admin = mockAdminClient()

    const result = await createPosTransaction(CASHIER_ID, baseInput())

    expect(result.status).toBe(200)
    expect(admin.from).toHaveBeenCalledWith('inventory')
    expect(admin.from).toHaveBeenCalledWith('stock_movements')

    // Verify the actual values passed into the stock_movements insert.
    const stockMovementsCalls = vi
      .mocked(admin.from)
      .mock.results.filter((_, i) => vi.mocked(admin.from).mock.calls[i]?.[0] === 'stock_movements')
    expect(stockMovementsCalls).toHaveLength(1)
    const insertMock = stockMovementsCalls[0]!.value.insert
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'sale',
        quantity_change: -2,
        product_id: PRODUCT_ID,
        variant_id: VARIANT_ID,
        location_id: LOCATION_ID,
        performed_by: CASHIER_ID,
      })
    )

    // 10 on hand - 2 sold = 8.
    const inventoryCalls = vi
      .mocked(admin.from)
      .mock.results.filter((_, i) => vi.mocked(admin.from).mock.calls[i]?.[0] === 'inventory')
    const updateMock = inventoryCalls[0]!.value.update
    expect(updateMock).toHaveBeenCalledWith({ quantity_on_hand: 8 })
  })

  it('rejects a discount code without a linked customer', async () => {
    mockSupabaseTables()
    mockAdminClient()

    const result = await createPosTransaction(CASHIER_ID, baseInput({ discountCode: 'SAVE10' }))
    expect(result.status).toBe(400)
    expect(result.error).toBe('A customer must be linked to apply a discount code')
  })

  it('rejects an invalid discount code even with a linked customer', async () => {
    const client = mockSupabaseTables()
    vi.mocked(client.rpc).mockResolvedValue({
      data: [{ is_valid: false, discount_amount_slsh: 0, error_message: 'This code has expired' }],
      error: null,
    } as never)
    mockAdminClient()

    const result = await createPosTransaction(
      CASHIER_ID,
      baseInput({ discountCode: 'EXPIRED', customerId: '00000000-0000-0000-0000-00000000000e' })
    )
    expect(result.status).toBe(400)
    expect(result.error).toBe('This code has expired')
  })

  it('applies a valid discount code, records its use, and increments uses_count', async () => {
    const customerId = '00000000-0000-0000-0000-00000000000e'
    const client = mockSupabaseTables({
      discount_codes: [{ data: { id: 'code-1' }, error: null }],
    })
    vi.mocked(client.rpc).mockResolvedValue({
      data: [{ is_valid: true, discount_amount_slsh: 2000, error_message: null }],
      error: null,
    } as never)
    const admin = createMockSupabaseClient({
      inventory: [{ data: null, error: null }],
      stock_movements: [{ data: null, error: null }],
      discount_codes: [
        { data: { uses_count: 4 }, error: null },
        { data: null, error: null },
      ],
      discount_code_uses: [{ data: null, error: null }],
    })
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const result = await createPosTransaction(
      CASHIER_ID,
      baseInput({ discountCode: 'SAVE10', customerId })
    )

    expect(result.status).toBe(200)
    expect(admin.from).toHaveBeenCalledWith('discount_code_uses')
    const usesCallIndex = vi
      .mocked(admin.from)
      .mock.calls.findIndex((c) => c[0] === 'discount_code_uses')
    const usesInsert = vi.mocked(admin.from).mock.results[usesCallIndex]!.value.insert
    expect(usesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ discount_code_id: 'code-1', customer_id: customerId })
    )

    const discountCodesCallIndices = vi
      .mocked(admin.from)
      .mock.calls.reduce<
        number[]
      >((acc, call, i) => (call[0] === 'discount_codes' ? [...acc, i] : acc), [])
    expect(discountCodesCallIndices).toHaveLength(2)
    const [, updateCallIndex] = discountCodesCallIndices
    const updateMock = vi.mocked(admin.from).mock.results[updateCallIndex!]!.value.update
    expect(updateMock).toHaveBeenCalledWith({ uses_count: 5 })
  })

  // Loyalty points are awarded by the trg_award_loyalty_points database
  // trigger on pos_transactions, not by application code — out of scope for
  // this app-layer unit test, which can only observe what createPosTransaction
  // itself does (session/stock/payment validation, transaction/items/splits
  // inserts, inventory decrement, and stock_movements bookkeeping).
})
