'use client'

import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

// A privacy screen for stepping away from the till, not a real
// authentication boundary — the schema has no PIN column, and Build Plan
// Phase 9 doesn't specify one. Resuming just returns to the POS screen; the
// session itself remains protected by the normal Supabase auth session.
export default function PosLockPage() {
  const router = useRouter()
  const profile = useAuthStore((s) => s.profile)

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-black">
      <Avatar className="size-20">
        <AvatarFallback className="text-2xl">{getInitials(profile?.full_name || profile?.phone || '?')}</AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className="flex items-center justify-center gap-2 text-lg font-semibold text-white">
          <Lock className="size-5" /> Terminal Locked
        </p>
        <p className="text-sm text-stone-400">{profile?.full_name || profile?.phone}</p>
      </div>
      <Button size="lg" onClick={() => router.push('/pos')}>
        Resume
      </Button>
    </div>
  )
}
