import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireRole } from '@/lib/require-role'
import { chainable } from '@/test/mock-supabase'

function mockClient(userId: string | null, role?: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn(() => chainable({ data: role ? { role } : null, error: null })),
  }
}

describe('requireRole', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('returns a 401 error when there is no authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient(null) as never)

    const result = await requireRole(['admin'])
    expect(result.error?.status).toBe(401)
  })

  it('returns a 403 error when the role is not in the allowed list', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient('user-1', 'customer') as never)

    const result = await requireRole(['admin'])
    expect(result.error?.status).toBe(403)
    expect(result.role).toBe('customer')
  })

  it('allows the request through when the role matches', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient('user-1', 'cashier') as never)

    const result = await requireRole(['cashier', 'admin'])
    expect(result.error).toBeNull()
    expect(result.userId).toBe('user-1')
    expect(result.role).toBe('cashier')
  })

  it('defaults an unset profile role to customer', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient('user-1', undefined) as never)

    const result = await requireRole(['customer'])
    expect(result.role).toBe('customer')
    expect(result.error).toBeNull()
  })

  it('requireAdmin only allows the admin role', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient('user-1', 'inventory_manager') as never)

    const result = await requireAdmin()
    expect(result.error?.status).toBe(403)
  })
})
