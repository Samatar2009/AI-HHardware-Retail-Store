import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/orders/validate-code/route'
import { chainable } from '@/test/mock-supabase'

const CUSTOMER_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_CUSTOMER_ID = '00000000-0000-0000-0000-000000000002'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/orders/validate-code', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function mockClient({
  userId = CUSTOMER_ID,
  role = 'customer',
  rpcResult,
}: {
  userId?: string | null
  role?: string
  rpcResult: { data: unknown; error: unknown }
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn(() => chainable({ data: { role }, error: null })),
    rpc: vi.fn().mockResolvedValue(rpcResult),
  }
}

describe('POST /api/orders/validate-code (check_discount_code_validity)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({ userId: null, rpcResult: { data: null, error: null } }) as never
    )

    const res = await POST(makeRequest({ code: 'SAVE10', orderTotalSlsh: 100000 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid body', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({ rpcResult: { data: null, error: null } }) as never
    )

    const res = await POST(makeRequest({ code: '', orderTotalSlsh: -5 }))
    expect(res.status).toBe(400)
  })

  it('reports an expired code as invalid', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({
        rpcResult: {
          data: [
            { is_valid: false, discount_amount_slsh: 0, error_message: 'This code has expired' },
          ],
          error: null,
        },
      }) as never
    )

    const res = await POST(makeRequest({ code: 'EXPIRED', orderTotalSlsh: 100000 }))
    const json = await res.json()
    expect(json).toEqual({
      isValid: false,
      discountAmountSlsh: 0,
      errorMessage: 'This code has expired',
    })
  })

  it('reports an over-limit code as invalid', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({
        rpcResult: {
          data: [
            {
              is_valid: false,
              discount_amount_slsh: 0,
              error_message: 'This code has reached its usage limit',
            },
          ],
          error: null,
        },
      }) as never
    )

    const res = await POST(makeRequest({ code: 'MAXEDOUT', orderTotalSlsh: 100000 }))
    const json = await res.json()
    expect(json.isValid).toBe(false)
    expect(json.errorMessage).toBe('This code has reached its usage limit')
  })

  it('returns the correct discount amount for a valid code', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({
        rpcResult: {
          data: [{ is_valid: true, discount_amount_slsh: 10000, error_message: null }],
          error: null,
        },
      }) as never
    )

    const res = await POST(makeRequest({ code: 'SAVE10', orderTotalSlsh: 100000 }))
    const json = await res.json()
    expect(json).toEqual({ isValid: true, discountAmountSlsh: 10000, errorMessage: null })
  })

  it('treats a missing RPC row as an invalid/expired code rather than erroring', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({ rpcResult: { data: [], error: null } }) as never
    )

    const res = await POST(makeRequest({ code: 'UNKNOWN', orderTotalSlsh: 100000 }))
    const json = await res.json()
    expect(json.isValid).toBe(false)
    expect(json.errorMessage).toBe('Invalid or expired code')
  })

  it('rejects a customer trying to validate a code for someone else', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({
        role: 'customer',
        rpcResult: { data: [{ is_valid: true, discount_amount_slsh: 5000 }], error: null },
      }) as never
    )

    const res = await POST(
      makeRequest({ code: 'SAVE10', orderTotalSlsh: 100000, customerId: OTHER_CUSTOMER_ID })
    )
    expect(res.status).toBe(403)
  })

  it('allows a cashier to validate a code on behalf of the customer linked to a POS sale', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockClient({
        role: 'cashier',
        rpcResult: { data: [{ is_valid: true, discount_amount_slsh: 5000 }], error: null },
      }) as never
    )

    const res = await POST(
      makeRequest({ code: 'SAVE10', orderTotalSlsh: 100000, customerId: OTHER_CUSTOMER_ID })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.isValid).toBe(true)
  })
})
