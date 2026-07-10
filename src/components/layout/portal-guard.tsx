'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types/auth'
import { Spinner } from '@/components/ui/spinner'

interface PortalGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

/**
 * Client-side companion to the server-side middleware role guard. Middleware
 * already blocks unauthorized requests before they reach the page, but the
 * Zustand auth store rehydrates from localStorage asynchronously on the
 * client — this avoids a flash of the wrong portal's content during that
 * brief window and re-checks on client-side navigation.
 */
function PortalGuard({ allowedRoles, children }: PortalGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const role = useAuthStore((s) => s.role)
  const [hasHydrated, setHasHydrated] = useState(useAuthStore.persist.hasHydrated())

  useEffect(() => {
    return useAuthStore.persist.onFinishHydration(() => setHasHydrated(true))
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    if (!role || !allowedRoles.includes(role)) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, role, pathname])

  if (!hasHydrated || !role || !allowedRoles.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <>{children}</>
}

export { PortalGuard }
