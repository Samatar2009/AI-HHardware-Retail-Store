import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks the whole Upstash layer with a deterministic in-memory sliding
// window, since exercising Upstash's real Lua-script-based algorithm would
// require a live Redis instance. This still verifies what src/lib/ratelimit.ts
// is actually responsible for: wiring each named limiter to the right
// (limit, window) pair, e.g. that `apiGeneral` really allows 20 requests
// before blocking the 21st.
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({})),
}))

vi.mock('@upstash/ratelimit', () => {
  class FakeRatelimit {
    private limit_: number
    private counts = new Map<string, number>()

    constructor(config: { limiter: { limit: number } }) {
      this.limit_ = config.limiter.limit
    }

    static slidingWindow(limit: number) {
      return { limit }
    }

    async limit(identifier: string) {
      const count = (this.counts.get(identifier) ?? 0) + 1
      this.counts.set(identifier, count)
      return { success: count <= this.limit_, remaining: Math.max(0, this.limit_ - count) }
    }
  }
  return { Ratelimit: FakeRatelimit }
})

describe('rateLimiters', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('allows requests up to the configured limit and blocks the next one', async () => {
    const { rateLimiters } = await import('@/lib/ratelimit')

    // apiGeneral is configured for 20 requests per window.
    for (let i = 0; i < 20; i++) {
      const { success } = await rateLimiters.apiGeneral.limit('1.2.3.4')
      expect(success).toBe(true)
    }
    const { success } = await rateLimiters.apiGeneral.limit('1.2.3.4')
    expect(success).toBe(false)
  })

  it('tracks each identifier independently', async () => {
    const { rateLimiters } = await import('@/lib/ratelimit')

    for (let i = 0; i < 3; i++) {
      expect((await rateLimiters.aiEstimate.limit('customer-a')).success).toBe(true)
    }
    // A different identifier has its own budget.
    expect((await rateLimiters.aiEstimate.limit('customer-b')).success).toBe(true)
    // customer-a is now exhausted (limit 3/min).
    expect((await rateLimiters.aiEstimate.limit('customer-a')).success).toBe(false)
  })

  it('enforces the tighter aiEstimate limit (3/min) versus aiChat (5/min)', async () => {
    const { rateLimiters } = await import('@/lib/ratelimit')

    for (let i = 0; i < 3; i++) {
      expect((await rateLimiters.aiEstimate.limit('ip')).success).toBe(true)
    }
    expect((await rateLimiters.aiEstimate.limit('ip')).success).toBe(false)

    for (let i = 0; i < 5; i++) {
      expect((await rateLimiters.aiChat.limit('ip')).success).toBe(true)
    }
    expect((await rateLimiters.aiChat.limit('ip')).success).toBe(false)
  })
})
