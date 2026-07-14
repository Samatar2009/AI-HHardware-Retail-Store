import { describe, expect, it } from 'vitest'

import { getClientIp } from '@/lib/get-client-ip'

function makeRequest(headers: Record<string, string>) {
  return new Request('http://localhost/api/test', { headers })
}

describe('getClientIp', () => {
  it('prefers x-real-ip when present', () => {
    const req = makeRequest({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })
    expect(getClientIp(req)).toBe('9.9.9.9')
  })

  it('uses the last entry of x-forwarded-for, not the first', () => {
    // The first entry is client-controlled; the last is appended by the
    // trusted proxy — trusting [0] lets a client rotate a fake IP per
    // request to bypass per-IP rate limiting.
    const req = makeRequest({ 'x-forwarded-for': 'attacker-controlled, 5.6.7.8' })
    expect(getClientIp(req)).toBe('5.6.7.8')
  })

  it('trims whitespace around forwarded-for entries', () => {
    const req = makeRequest({ 'x-forwarded-for': ' 1.1.1.1 ,  5.6.7.8  ' })
    expect(getClientIp(req)).toBe('5.6.7.8')
  })

  it('falls back to a loopback address when no headers are present', () => {
    const req = makeRequest({})
    expect(getClientIp(req)).toBe('127.0.0.1')
  })
})
