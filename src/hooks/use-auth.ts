'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import type { UserRole } from '@/types/auth'

async function loadProfileIntoStore() {
  const res = await fetch('/api/auth/me')
  if (!res.ok) return
  const { profile } = await res.json()
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  useAuthStore.getState().setUser(user, profile)
}

function useAuth() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const role = useAuthStore((s) => s.role)
  const clearUser = useAuthStore((s) => s.clearUser)
  const clearCart = useCartStore((s) => s.clearCart)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadProfileIntoStore()
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void loadProfileIntoStore()
      } else if (event === 'SIGNED_OUT') {
        clearUser()
        clearCart()
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    await createClient().auth.signOut()
    clearUser()
    clearCart()
    router.push('/sign-in')
  }

  return { user, profile, role, isLoading, signOut }
}

/** Redirects to /sign-in if not authenticated, or not one of requiredRoles. */
function useRequireAuth(requiredRoles?: UserRole[]) {
  const { role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!role || (requiredRoles && !requiredRoles.includes(role))) {
      router.replace('/sign-in')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, role])
}

export { useAuth, useRequireAuth }
