import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/get-client-ip', () => ({ getClientIp: vi.fn(() => '1.2.3.4') }))
vi.mock('@/lib/ratelimit', () => ({
  rateLimiters: { orderCreate: { limit: vi.fn() } },
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimiters } from '@/lib/ratelimit'
import { POST } from '@/app/api/orders/route'

const VALID_BODY = {
  locationId: '00000000-0000-0000-0000-000000000001',
  items: [
    {
      productId: '00000000-0000-0000-0000-000000000002',
      variantId: '00000000-0000-0000-0000-000000000003',
      quantity: 2,
    },
  ],
  paymentMethod: 'cash_on_pickup' as const,
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/orders', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.mocked(rateLimiters.orderCreate.limit).mockResolvedValue({ success: true } as never)
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'customer-1' } } }) },
    } as never)
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    vi.mocked(rateLimiters.orderCreate.limit).mockResolvedValue({ success: false } as never)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(429)
  })

  it('returns 401 when the caller is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid body', async () => {
    const res = await POST(makeRequest({ locationId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the create_order RPC reports insufficient stock', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Insufficient stock for SKU-1' } }),
    } as never)

    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toBe('Insufficient stock for SKU-1')
  })

  it('creates the order and returns order details on success', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            order_id: 'order-1',
            order_number: 'BH-2026-00001',
            pickup_code: 'ABC123',
            total_slsh: 100000,
          },
        ],
        error: null,
      }),
    } as never)

    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({
      orderId: 'order-1',
      orderNumber: 'BH-2026-00001',
      pickupCode: 'ABC123',
      totalSlsh: 100000,
    })
  })
})
