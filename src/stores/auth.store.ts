import type { User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Row } from '@/types/database'
import type { UserRole } from '@/types/auth'

type Profile = Row<'profiles'>

interface AuthState {
  user: User | null
  profile: Profile | null
  role: UserRole | null
  setUser: (user: User | null, profile: Profile | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      role: null,
      setUser: (user, profile) =>
        set({ user, profile, role: (profile?.role as UserRole | undefined) ?? null }),
      clearUser: () => set({ user: null, profile: null, role: null }),
    }),
    {
      name: 'borama-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
