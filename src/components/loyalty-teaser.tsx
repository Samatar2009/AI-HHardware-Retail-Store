'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'

import { useAuthStore } from '@/stores/auth.store'
import { createClient } from '@/lib/supabase/client'
import { LoyaltyBadge } from '@/components/loyalty-badge'
import type { LoyaltyTierName } from '@/types/loyalty'

interface LoyaltyCardSummary {
  current_points: number
  current_tier: string
}

function LoyaltyTeaser() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const [card, setCard] = useState<LoyaltyCardSummary | null>(null)

  useEffect(() => {
    if (!user || role !== 'customer') return
    const supabase = createClient()
    supabase
      .from('loyalty_cards')
      .select('current_points, current_tier')
      .eq('customer_id', user.id)
      .single()
      .then(({ data }) => setCard(data))
  }, [user, role])

  if (!user || role !== 'customer') {
    return (
      <Link
        href="/sign-in"
        className="flex items-center justify-between rounded-md border border-stone-200 bg-white p-4 transition-colors duration-100 hover:border-orange-300"
      >
        <div className="flex items-center gap-3">
          <Star className="size-6 text-orange-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-stone-900">Join our loyalty program</p>
            <p className="text-xs text-stone-500">Sign in to start earning points on every purchase</p>
          </div>
        </div>
      </Link>
    )
  }

  if (!card) return null

  return (
    <div className="flex items-center justify-between rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <Star className="size-6 text-orange-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-stone-900">{card.current_points} points</p>
          <p className="text-xs text-stone-500">Keep shopping to reach the next tier</p>
        </div>
      </div>
      <LoyaltyBadge tier={card.current_tier as LoyaltyTierName} />
    </div>
  )
}

export { LoyaltyTeaser }
