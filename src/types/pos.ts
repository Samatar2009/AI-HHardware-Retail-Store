import type { Row } from './database'

export type PosSession = Row<'pos_sessions'>
export type PosTransaction = Row<'pos_transactions'>
export type PosTransactionItem = Row<'pos_transaction_items'>
export type PaymentSplit = Row<'pos_payment_splits'>
export type ParkedCart = Row<'parked_transactions'>

export type PosSessionStatus = 'open' | 'closed'
export type PosTransactionStatus = 'completed' | 'voided'
export type PosPaymentMethod = 'cash' | 'zaad' | 'edahab' | 'evc_plus' | 'sahal'
