import type { Row } from './database'

export type LoyaltyCard = Row<'loyalty_cards'>
export type LoyaltyTier = Row<'loyalty_tiers'>
export type LoyaltyTransaction = Row<'loyalty_transactions'>

export type LoyaltyTierName = 'bronze' | 'silver' | 'gold'
export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjust'
