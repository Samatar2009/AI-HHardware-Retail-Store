'use client'

import { Bell, LogOut } from 'lucide-react'

import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface AdminHeaderProps {
  title: string
  notificationCount?: number
}

function AdminHeader({ title, notificationCount = 0 }: AdminHeaderProps) {
  const profile = useAuthStore((s) => s.profile)
  const clearUser = useAuthStore((s) => s.clearUser)

  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-16 items-center gap-4 border-b border-stone-200 bg-white px-8">
      <h1 className="text-lg font-semibold text-stone-900">{title}</h1>

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-md p-2 text-stone-500 transition-colors duration-100 hover:bg-stone-100"
        >
          <Bell className="size-5" aria-hidden="true" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {profile && (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{getInitials(profile.full_name || profile.phone)}</AvatarFallback>
            </Avatar>
            <Badge variant="roleAdmin">Admin</Badge>
          </div>
        )}

        <button
          type="button"
          onClick={() => clearUser()}
          aria-label="Sign out"
          className="rounded-md p-2 text-stone-500 transition-colors duration-100 hover:bg-stone-100"
        >
          <LogOut className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export { AdminHeader }
