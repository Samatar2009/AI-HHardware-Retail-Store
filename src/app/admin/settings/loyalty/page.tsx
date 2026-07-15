'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'

interface TierRow {
  id: string
  tier_name: string
  tier_name_so: string
  min_lifetime_points: number
  discount_percentage: number
}

const TIER_BADGE = {
  bronze: 'loyaltyBronze',
  silver: 'loyaltySilver',
  gold: 'loyaltyGold',
} as const

export default function AdminLoyaltySettingsPage() {
  const [tiers, setTiers] = useState<TierRow[]>([])

  useEffect(() => {
    void fetch('/api/admin/loyalty-tiers')
      .then((res) => res.json())
      .then((data: { tiers: TierRow[] }) => setTiers(data.tiers))
  }, [])

  async function updateTier(
    tier: TierRow,
    field: 'min_lifetime_points' | 'discount_percentage',
    value: number
  ) {
    setTiers((prev) => prev.map((t) => (t.id === tier.id ? { ...t, [field]: value } : t)))
    const key = field === 'min_lifetime_points' ? 'minLifetimePoints' : 'discountPercentage'
    const res = await fetch(`/api/admin/loyalty-tiers/${tier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) showSuccessToast('Tier updated')
    else showErrorToast('Could not update tier')
  }

  return (
    <div>
      <PageHeader
        title="Loyalty Configuration"
        subtitle="Tier thresholds and discount percentages"
      />
      <div className="flex flex-col gap-4">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardContent className="flex items-center gap-6">
              <Badge variant={TIER_BADGE[tier.tier_name as keyof typeof TIER_BADGE]}>
                {tier.tier_name}
              </Badge>
              <Input
                label="Minimum Lifetime Points"
                type="number"
                defaultValue={tier.min_lifetime_points}
                onBlur={(e) => void updateTier(tier, 'min_lifetime_points', Number(e.target.value))}
              />
              <Input
                label="Discount Percentage"
                type="number"
                defaultValue={tier.discount_percentage}
                onBlur={(e) => void updateTier(tier, 'discount_percentage', Number(e.target.value))}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
