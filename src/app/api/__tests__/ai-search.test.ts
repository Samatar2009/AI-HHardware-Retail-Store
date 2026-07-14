import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/ai', () => ({ embedText: vi.fn() }))
vi.mock('@/lib/get-client-ip', () => ({ getClientIp: vi.fn(() => '1.2.3.4') }))
vi.mock('@/lib/ratelimit', () => ({
  rateLimiters: { search: { limit: vi.fn() } },
}))

import { createClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/ai'
import { rateLimiters } from '@/lib/ratelimit'
import { POST } from '@/app/api/ai/search/route'
import { chainable } from '@/test/mock-supabase'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/ai/search', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function productRow(id: string, nameEn: string) {
  return {
    id,
    name_en: nameEn,
    name_so: nameEn,
    brand: null,
    product_images: [],
    product_variants: [{ price_slsh: 10000, is_active: true, inventory: [] }],
  }
}

describe('POST /api/ai/search (match_products_semantic)', () => {
  beforeEach(() => {
    vi.mocked(rateLimiters.search.limit).mockResolvedValue({ success: true } as never)
    vi.mocked(embedText).mockResolvedValue([0.1, 0.2, 0.3])
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    vi.mocked(rateLimiters.search.limit).mockResolvedValue({ success: false } as never)

    const res = await POST(makeRequest({ query: 'cement' }))
    expect(res.status).toBe(429)
  })

  it('returns 400 for an invalid body', async () => {
    const res = await POST(makeRequest({ query: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 502 when embedding the query fails', async () => {
    vi.mocked(embedText).mockRejectedValue(new Error('Gemini unavailable'))

    const res = await POST(makeRequest({ query: 'cement for foundations' }))
    expect(res.status).toBe(502)
  })

  it('returns 500 when the semantic match RPC errors', async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc failed' } }),
    } as never)

    const res = await POST(makeRequest({ query: 'cement for foundations' }))
    expect(res.status).toBe(500)
  })

  it('returns an empty results array when there are no matches', async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never)

    const res = await POST(makeRequest({ query: 'unobtainium' }))
    const json = await res.json()
    expect(json).toEqual({ results: [] })
  })

  it('returns products ranked in the order returned by the semantic match, not table order', async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: [{ product_id: 'p2' }, { product_id: 'p1' }],
        error: null,
      }),
      from: vi.fn(() =>
        chainable({
          data: [productRow('p1', 'Cement Mixer'), productRow('p2', 'Portland Cement 50kg Bag')],
          error: null,
        })
      ),
    } as never)

    const res = await POST(makeRequest({ query: 'cement for foundations' }))
    const json = await res.json()
    expect(json.results.map((r: { id: string }) => r.id)).toEqual(['p2', 'p1'])
    expect(json.results[0].nameEn).toBe('Portland Cement 50kg Bag')
  })
})
