import { Award } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { LoyaltyTierName } from '@/types/loyalty'

const TIER_CONFIG: Record<LoyaltyTierName, { variant: 'loyaltyBronze' | 'loyaltySilver' | 'loyaltyGold'; label: string }> = {
  bronze: { variant: 'loyaltyBronze', label: 'Bronze' },
  silver: { variant: 'loyaltySilver', label: 'Silver' },
  gold: { variant: 'loyaltyGold', label: 'Gold' },
}

function LoyaltyBadge({ tier }: { tier: LoyaltyTierName }) {
  const config = TIER_CONFIG[tier]

  return (
    <Badge variant={config.variant}>
      <Award className="size-3.5" aria-hidden="true" />
      {config.label}
    </Badge>
  )
}

export { LoyaltyBadge }
