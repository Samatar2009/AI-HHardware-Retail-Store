import { describe, expect, it } from 'vitest'

import { safeNext } from '@/lib/safe-next'

describe('safeNext', () => {
  it('allows a same-origin relative path', () => {
    expect(safeNext('/checkout')).toBe('/checkout')
    expect(safeNext('/admin/dashboard?tab=orders')).toBe('/admin/dashboard?tab=orders')
  })

  it('rejects null or undefined', () => {
    expect(safeNext(null)).toBeNull()
    expect(safeNext(undefined)).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(safeNext('')).toBeNull()
  })

  it('rejects an absolute URL (open-redirect attempt)', () => {
    expect(safeNext('https://evil.example.com')).toBeNull()
    expect(safeNext('http://evil.example.com/phish')).toBeNull()
  })

  it('rejects a protocol-relative URL', () => {
    expect(safeNext('//evil.example.com')).toBeNull()
  })

  it('rejects a backslash-prefixed path some browsers treat as protocol-relative', () => {
    expect(safeNext('/\\evil.example.com')).toBeNull()
  })

  it('rejects a path with no leading slash', () => {
    expect(safeNext('checkout')).toBeNull()
  })
})
