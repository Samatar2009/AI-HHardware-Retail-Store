import type { Database as GeneratedDatabase } from '@/lib/supabase/types'

export type Database = GeneratedDatabase

export type Table<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]

export type Row<T extends keyof Database['public']['Tables']> = Table<T>['Row']

export type InsertRow<T extends keyof Database['public']['Tables']> = Table<T>['Insert']

export type UpdateRow<T extends keyof Database['public']['Tables']> = Table<T>['Update']
