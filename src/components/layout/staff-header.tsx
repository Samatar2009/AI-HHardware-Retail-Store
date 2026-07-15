'use client'

import { useEffect, useState } from 'react'
import { LogOut, MapPin } from 'lucide-react'

import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface StaffHeaderProps {
  title: string
}

function StaffHeader({ title }: StaffHeaderProps) {
  const profile = useAuthStore((s) => s.profile)
  const { signOut } = useAuth()
  const [locationName, setLocationName] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.location_id) return
    void fetch('/api/locations')
      .then((res) => res.json())
      .then((data: { locations: { id: string; name_en: string }[] }) => {
        setLocationName(data.locations.find((l) => l.id === profile.location_id)?.name_en ?? null)
      })
  }, [profile?.location_id])

  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-16 items-center gap-4 border-b border-stone-200 bg-white px-8">
      <h1 className="text-lg font-semibold text-stone-900">{title}</h1>
      {locationName && (
        <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
          <MapPin className="size-4" aria-hidden="true" />
          {locationName}
        </span>
      )}

      <div className="ml-auto flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {getInitials(profile.full_name || profile.phone)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-stone-700">{profile.full_name || profile.phone}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="Sign out"
          className="rounded-md p-2 text-stone-500 transition-colors duration-100 hover:bg-stone-100"
        >
          <LogOut className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export { StaffHeader }
