import type { Row } from './database'

export type InventoryLevel = Row<'inventory'>
export type StockMovement = Row<'stock_movements'>
export type InventoryAlert = Row<'inventory_alerts'>
export type Stocktake = Row<'stocktakes'>
export type StocktakeItem = Row<'stocktake_items'>
export type AiForecast = Row<'ai_forecasts'>

export type StockMovementType =
  | 'receive'
  | 'sale'
  | 'return'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'stocktake_correction'
  | 'void'

export type InventoryAlertType = 'low_stock' | 'out_of_stock'

export type StocktakeStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
