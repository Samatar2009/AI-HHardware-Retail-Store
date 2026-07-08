export type UserRole = 'customer' | 'cashier' | 'inventory_manager' | 'admin'

export interface AuthUser {
  id: string
  phone: string
  role: UserRole
  fullName: string
  locationId: string | null
  preferredLanguage: 'en' | 'so'
  preferredCurrency: 'SLSH' | 'USD'
  isActive: boolean
}
