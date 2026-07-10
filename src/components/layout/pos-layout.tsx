'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, MapPin, User } from 'lucide-react'

import { useAuthStore } from '@/stores/auth.store'
import { usePosStore } from '@/stores/pos.store'
import { Badge } from '@/components/ui/badge'

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}

function PosLayout({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus()
  const profile = useAuthStore((s) => s.profile)
  const activeSession = usePosStore((s) => s.activeSession)
  const router = useRouter()

  return (
    <div className="h-screen bg-black">
      <div className="flex h-[52px] items-center gap-4 border-b border-stone-700 bg-black px-4">
        <Badge variant={isOnline ? 'posOnline' : 'posOffline'} dot>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Badge>

        {profile && (
          <span className="inline-flex items-center gap-1.5 text-sm text-stone-300">
            <User className="size-4" aria-hidden="true" />
            {profile.full_name || profile.phone}
          </span>
        )}

        {activeSession && (
          <span className="inline-flex items-center gap-1.5 text-sm text-stone-300">
            <MapPin className="size-4" aria-hidden="true" />
            Session #{activeSession.id.slice(0, 8)}
          </span>
        )}

        <button
          type="button"
          onClick={() => router.push('/pos/lock')}
          aria-label="Lock terminal"
          className="ml-auto rounded-md p-2 text-stone-300 transition-colors duration-100 hover:bg-stone-800"
        >
          <Lock className="size-5" aria-hidden="true" />
        </button>
      </div>

      <main className="h-[calc(100vh-52px)]">{children}</main>
    </div>
  )
}

export { PosLayout }
