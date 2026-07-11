'use client'

import { useQuery } from '@tanstack/react-query'
import { Award, Star } from 'lucide-react'

import { formatDate, formatSLSH, getInitials } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { LoyaltyBadge } from '@/components/loyalty-badge'
import { DataTable } from '@/components/data-table'
import { Progress } from '@/components/ui/progress'
import type { Row } from '@/types/database'
import type { LoyaltyTierName } from '@/types/loyalty'

type LoyaltyCard = Row<'loyalty_cards'>
type LoyaltyTier = Row<'loyalty_tiers'>
type LoyaltyTransaction = Row<'loyalty_transactions'>

const TRANSACTION_LABEL: Record<string, { label: string; className: string; sign: string }> = {
  earn: { label: 'Earned', className: 'text-green-600', sign: '+' },
  redeem: { label: 'Redeemed', className: 'text-red-600', sign: '' },
  adjust: { label: 'Adjusted', className: 'text-stone-500', sign: '' },
}

export default function LoyaltyPage() {
  const { user, profile } = useAuth()

  const { data } = useQuery({
    queryKey: ['loyalty-page', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const supabase = createClient()
      const { data: card } = await supabase.from('loyalty_cards').select('*').eq('customer_id', user!.id).maybeSingle()
      const { data: tiers } = await supabase.from('loyalty_tiers').select('*').order('min_lifetime_points')
      return { card: card as LoyaltyCard | null, tiers: (tiers ?? []) as LoyaltyTier[] }
    },
  })

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['loyalty-transactions-page', data?.card?.id],
    enabled: !!data?.card,
    queryFn: async () => {
      const res = await fetch('/api/loyalty/transactions?limit=50')
      return (await res.json()) as { transactions: LoyaltyTransaction[] }
    },
  })

  if (!data?.card) return null

  const { card, tiers } = data
  const currentTier = tiers.find((t) => t.tier_name === card.current_tier)
  const nextTier = tiers.find((t) => t.min_lifetime_points > card.lifetime_points)
  const isMaxTier = !nextTier
  const pointsToNext = nextTier ? nextTier.min_lifetime_points - card.lifetime_points : 0
  const progressPct = nextTier
    ? Math.min(100, (card.lifetime_points / nextTier.min_lifetime_points) * 100)
    : 100

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">Loyalty</h1>

      <div className="mb-6 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">{profile?.full_name || getInitials(profile?.phone ?? '')}</p>
            <p className="mt-0.5 font-mono text-sm text-orange-100">{card.card_number}</p>
          </div>
          <LoyaltyBadge tier={card.current_tier as LoyaltyTierName} />
        </div>
        <div className="mt-6">
          <p className="text-4xl font-bold">{card.current_points}</p>
          <p className="text-sm text-orange-100">points · {card.lifetime_points} lifetime</p>
        </div>
      </div>

      <div className="mb-6 rounded-md border border-stone-200 bg-white p-4">
        {isMaxTier ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-600">
            <Award className="size-5" /> Maximum tier achieved!
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm text-stone-600">
              You need {pointsToNext} more points for {nextTier!.tier_name} status.
            </p>
            <Progress value={progressPct} />
          </>
        )}
      </div>

      <div className="mb-6 overflow-x-auto rounded-md border border-stone-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-stone-900">Tier Benefits</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
              <th className="py-2">Tier</th>
              <th className="py-2">Min Points</th>
              <th className="py-2">Discount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tiers.map((tier) => (
              <tr key={tier.id} className={tier.tier_name === card.current_tier ? 'bg-orange-50' : ''}>
                <td className="py-2 capitalize">{tier.tier_name}</td>
                <td className="py-2">{tier.min_lifetime_points}</td>
                <td className="py-2">{tier.discount_percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {currentTier && (
        <div className="mb-6 flex items-center gap-2 rounded-md bg-stone-50 p-4 text-sm text-stone-600">
          <Star className="size-4 text-orange-500" />
          Redeem 100+ points at checkout for {currentTier.discount_percentage}% off (
          {formatSLSH(Math.round((card.current_points * currentTier.discount_percentage) / 100))} value on
          your current balance).
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold text-stone-900">Points History</p>
        <DataTable
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (t: LoyaltyTransaction) => formatDate(t.created_at),
            },
            {
              key: 'type',
              header: 'Type',
              render: (t: LoyaltyTransaction) => TRANSACTION_LABEL[t.transaction_type]?.label ?? t.transaction_type,
            },
            {
              key: 'points',
              header: 'Points',
              render: (t: LoyaltyTransaction) => (
                <span className={TRANSACTION_LABEL[t.transaction_type]?.className}>
                  {t.points > 0 ? '+' : ''}
                  {t.points}
                </span>
              ),
            },
            {
              key: 'source',
              header: 'Source',
              render: (t: LoyaltyTransaction) => t.reference_type ?? '—',
            },
          ]}
          data={transactionsData?.transactions ?? []}
          getRowId={(t) => t.id}
          isLoading={transactionsLoading}
          emptyTitle="No transactions yet"
        />
      </div>
    </div>
  )
}
