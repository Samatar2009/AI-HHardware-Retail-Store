import 'server-only'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/auth'

interface RequireRoleResult {
  userId: string
  role: UserRole
  error: NextResponse | null
}

/** Verifies the caller is authenticated and has one of the allowed roles.
 * Returns `error` (a ready-to-return NextResponse) when the check fails —
 * routes should `if (result.error) return result.error` immediately. */
export async function requireRole(allowedRoles: UserRole[]): Promise<RequireRoleResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      userId: '',
      role: 'customer',
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  const role = (profile?.role as UserRole) ?? 'customer'

  if (!allowedRoles.includes(role)) {
    return {
      userId: user.id,
      role,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { userId: user.id, role, error: null }
}

export const requireAdmin = () => requireRole(['admin'])
