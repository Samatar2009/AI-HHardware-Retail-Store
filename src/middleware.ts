import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { UserRole } from '@/types/auth'

const ROLE_GUARDS: { prefix: string; allowed: UserRole[] }[] = [
  { prefix: '/admin', allowed: ['admin'] },
  { prefix: '/inventory', allowed: ['inventory_manager', 'admin'] },
  { prefix: '/pos', allowed: ['cashier', 'inventory_manager', 'admin'] },
  { prefix: '/staff', allowed: ['cashier', 'inventory_manager', 'admin'] },
]

const AUTH_REQUIRED_PREFIXES = ['/orders', '/loyalty', '/returns']

function decodeUserRole(accessToken: string): UserRole | null {
  try {
    const payload = accessToken.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as { user_role?: UserRole }
    return claims.user_role ?? null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // Revalidates the token against the Auth server (unlike getSession(), which
  // only reads the cookie and cannot be trusted for authorization decisions).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const roleGuard = ROLE_GUARDS.find((guard) => pathname.startsWith(guard.prefix))
  const requiresAuth = roleGuard || AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (requiresAuth) {
    if (!user) {
      const redirectUrl = new URL('/sign-in', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (roleGuard) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const role = session ? decodeUserRole(session.access_token) : null

      if (!role || !roleGuard.allowed.includes(role)) {
        const redirectUrl = new URL('/sign-in', request.url)
        redirectUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
