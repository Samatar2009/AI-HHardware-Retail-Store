export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_forecasts: {
        Row: {
          confidence_score: number
          data_period_days: number
          generated_at: string
          id: string
          location_id: string
          predicted_stockout_date: string
          product_id: string
          reasoning_text: string
          recommended_reorder_qty: number
          variant_id: string | null
        }
        Insert: {
          confidence_score: number
          data_period_days?: number
          generated_at?: string
          id?: string
          location_id: string
          predicted_stockout_date: string
          product_id: string
          reasoning_text: string
          recommended_reorder_qty: number
          variant_id?: string | null
        }
        Update: {
          confidence_score?: number
          data_period_days?: number
          generated_at?: string
          id?: string
          location_id?: string
          predicted_stockout_date?: string
          product_id?: string
          reasoning_text?: string
          recommended_reorder_qty?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_forecasts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_forecasts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      banners: {
        Row: {
          active_from: string
          active_until: string
          created_at: string
          cta_text_en: string | null
          cta_text_so: string | null
          cta_url: string | null
          id: string
          image_url: string
          is_active: boolean
          scope_location_id: string | null
          scope_type: string
          sort_order: number
          title_en: string
          title_so: string
        }
        Insert: {
          active_from: string
          active_until: string
          created_at?: string
          cta_text_en?: string | null
          cta_text_so?: string | null
          cta_url?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          scope_location_id?: string | null
          scope_type?: string
          sort_order?: number
          title_en: string
          title_so: string
        }
        Update: {
          active_from?: string
          active_until?: string
          created_at?: string
          cta_text_en?: string | null
          cta_text_so?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          scope_location_id?: string | null
          scope_type?: string
          sort_order?: number
          title_en?: string
          title_so?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_scope_location_id_fkey"
            columns: ["scope_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          is_active: boolean
          name_en: string
          name_so: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_so: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_so?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_uses: {
        Row: {
          customer_id: string
          discount_code_id: string
          id: string
          order_id: string
          used_at: string
        }
        Insert: {
          customer_id: string
          discount_code_id: string
          id?: string
          order_id: string
          used_at?: string
        }
        Update: {
          customer_id?: string
          discount_code_id?: string
          id?: string
          order_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_uses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discount_code_uses_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          id: string
          is_active: boolean
          max_total_uses: number | null
          max_uses_per_customer: number
          minimum_order_slsh: number
          scope_id: string | null
          scope_type: string
          uses_count: number
          valid_from: string
          valid_until: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: string
          id?: string
          is_active?: boolean
          max_total_uses?: number | null
          max_uses_per_customer?: number
          minimum_order_slsh?: number
          scope_id?: string | null
          scope_type?: string
          uses_count?: number
          valid_from: string
          valid_until: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          id?: string
          is_active?: boolean
          max_total_uses?: number | null
          max_uses_per_customer?: number
          minimum_order_slsh?: number
          scope_id?: string | null
          scope_type?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          id: string
          set_by: string | null
          usd_to_slsh_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          set_by?: string | null
          usd_to_slsh_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          set_by?: string | null
          usd_to_slsh_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inventory: {
        Row: {
          aisle_shelf: string | null
          created_at: string
          id: string
          last_restocked_at: string | null
          location_id: string
          product_id: string
          quantity_on_hand: number
          quantity_reserved: number
          threshold: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          aisle_shelf?: string | null
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          location_id: string
          product_id: string
          quantity_on_hand?: number
          quantity_reserved?: number
          threshold?: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          aisle_shelf?: string | null
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          location_id?: string
          product_id?: string
          quantity_on_hand?: number
          quantity_reserved?: number
          threshold?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean
          location_id: string
          product_id: string
          resolved_at: string | null
          variant_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          location_id: string
          product_id: string
          resolved_at?: string | null
          variant_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          location_id?: string
          product_id?: string
          resolved_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_hours: {
        Row: {
          close_time: string
          day_of_week: number
          has_prayer_break: boolean
          id: string
          is_closed: boolean
          location_id: string
          open_time: string
          prayer_end: string | null
          prayer_start: string | null
        }
        Insert: {
          close_time: string
          day_of_week: number
          has_prayer_break?: boolean
          id?: string
          is_closed?: boolean
          location_id: string
          open_time: string
          prayer_end?: string | null
          prayer_start?: string | null
        }
        Update: {
          close_time?: string
          day_of_week?: number
          has_prayer_break?: boolean
          id?: string
          is_closed?: boolean
          location_id?: string
          open_time?: string
          prayer_end?: string | null
          prayer_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_so: string
          phone: string | null
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_so: string
          phone?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_so?: string
          phone?: string | null
        }
        Relationships: []
      }
      loyalty_cards: {
        Row: {
          card_number: string
          created_at: string
          current_points: number
          current_tier: string
          customer_id: string
          id: string
          lifetime_points: number
          updated_at: string
        }
        Insert: {
          card_number: string
          created_at?: string
          current_points?: number
          current_tier?: string
          customer_id: string
          id?: string
          lifetime_points?: number
          updated_at?: string
        }
        Update: {
          card_number?: string
          created_at?: string
          current_points?: number
          current_tier?: string
          customer_id?: string
          id?: string
          lifetime_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          discount_percentage: number
          id: string
          min_lifetime_points: number
          tier_name: string
          tier_name_so: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          discount_percentage: number
          id?: string
          min_lifetime_points: number
          tier_name: string
          tier_name_so: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          discount_percentage?: number
          id?: string
          min_lifetime_points?: number
          tier_name?: string
          tier_name_so?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tiers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          id: string
          loyalty_card_id: string
          notes: string | null
          performed_by: string | null
          points: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          loyalty_card_id: string
          notes?: string | null
          performed_by?: string | null
          points: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          id?: string
          loyalty_card_id?: string
          notes?: string | null
          performed_by?: string | null
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mobile_money_settings: {
        Row: {
          id: string
          instructions_en: string
          instructions_so: string
          is_active: boolean
          location_id: string
          merchant_number: string
          provider: string
        }
        Insert: {
          id?: string
          instructions_en: string
          instructions_so: string
          is_active?: boolean
          location_id: string
          merchant_number: string
          provider: string
        }
        Update: {
          id?: string
          instructions_en?: string
          instructions_so?: string
          is_active?: boolean
          location_id?: string
          merchant_number?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name_en: string
          product_name_so: string
          quantity: number
          sku: string
          total_price_slsh: number
          unit_price_slsh: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name_en: string
          product_name_so: string
          quantity: number
          sku: string
          total_price_slsh: number
          unit_price_slsh: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name_en?: string
          product_name_so?: string
          quantity?: number
          sku?: string
          total_price_slsh?: number
          unit_price_slsh?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          customer_id: string
          discount_amount_slsh: number
          discount_code_id: string | null
          exchange_rate_at_order: number
          id: string
          location_id: string
          loyalty_discount_slsh: number
          loyalty_points_earned: number
          loyalty_points_redeemed: number
          notes: string | null
          order_number: string
          payment_method: string
          payment_reference: string | null
          payment_status: string
          pickup_code: string | null
          status: string
          subtotal_slsh: number
          total_slsh: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          customer_id: string
          discount_amount_slsh?: number
          discount_code_id?: string | null
          exchange_rate_at_order: number
          id?: string
          location_id: string
          loyalty_discount_slsh?: number
          loyalty_points_earned?: number
          loyalty_points_redeemed?: number
          notes?: string | null
          order_number: string
          payment_method: string
          payment_reference?: string | null
          payment_status?: string
          pickup_code?: string | null
          status?: string
          subtotal_slsh: number
          total_slsh: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          customer_id?: string
          discount_amount_slsh?: number
          discount_code_id?: string | null
          exchange_rate_at_order?: number
          id?: string
          location_id?: string
          loyalty_discount_slsh?: number
          loyalty_points_earned?: number
          loyalty_points_redeemed?: number
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          pickup_code?: string | null
          status?: string
          subtotal_slsh?: number
          total_slsh?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      parked_transactions: {
        Row: {
          cart_data: Json
          cashier_id: string
          expires_at: string
          id: string
          is_recalled: boolean
          location_id: string
          parked_at: string
          pos_session_id: string
        }
        Insert: {
          cart_data: Json
          cashier_id: string
          expires_at?: string
          id?: string
          is_recalled?: boolean
          location_id: string
          parked_at?: string
          pos_session_id: string
        }
        Update: {
          cart_data?: Json
          cashier_id?: string
          expires_at?: string
          id?: string
          is_recalled?: boolean
          location_id?: string
          parked_at?: string
          pos_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parked_transactions_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "parked_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parked_transactions_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_slsh: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          order_id: string | null
          payment_method: string
          pos_transaction_id: string | null
          status: string
          transaction_reference: string | null
        }
        Insert: {
          amount_slsh: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method: string
          pos_transaction_id?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Update: {
          amount_slsh?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method?: string
          pos_transaction_id?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_pos_transaction_id_fkey"
            columns: ["pos_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_payment_splits: {
        Row: {
          amount_slsh: number
          change_slsh: number
          confirmed_at: string | null
          confirmed_by: string | null
          id: string
          is_confirmed: boolean
          payment_method: string
          pos_transaction_id: string
          transaction_reference: string | null
        }
        Insert: {
          amount_slsh: number
          change_slsh?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          is_confirmed?: boolean
          payment_method: string
          pos_transaction_id: string
          transaction_reference?: string | null
        }
        Update: {
          amount_slsh?: number
          change_slsh?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          is_confirmed?: boolean
          payment_method?: string
          pos_transaction_id?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_payment_splits_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pos_payment_splits_pos_transaction_id_fkey"
            columns: ["pos_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          cash_variance_slsh: number | null
          cashier_id: string
          closed_at: string | null
          ending_cash_slsh: number | null
          ending_cash_usd: number | null
          id: string
          location_id: string
          opened_at: string
          starting_cash_slsh: number
          starting_cash_usd: number
          status: string
          total_cash_sales_slsh: number
          total_sales_slsh: number
          total_voids_slsh: number
        }
        Insert: {
          cash_variance_slsh?: number | null
          cashier_id: string
          closed_at?: string | null
          ending_cash_slsh?: number | null
          ending_cash_usd?: number | null
          id?: string
          location_id: string
          opened_at?: string
          starting_cash_slsh?: number
          starting_cash_usd?: number
          status?: string
          total_cash_sales_slsh?: number
          total_sales_slsh?: number
          total_voids_slsh?: number
        }
        Update: {
          cash_variance_slsh?: number | null
          cashier_id?: string
          closed_at?: string | null
          ending_cash_slsh?: number | null
          ending_cash_usd?: number | null
          id?: string
          location_id?: string
          opened_at?: string
          starting_cash_slsh?: number
          starting_cash_usd?: number
          status?: string
          total_cash_sales_slsh?: number
          total_sales_slsh?: number
          total_voids_slsh?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pos_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transaction_items: {
        Row: {
          id: string
          pos_transaction_id: string
          product_id: string | null
          product_name_en: string
          quantity: number
          sku: string
          total_price_slsh: number
          unit_price_slsh: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          pos_transaction_id: string
          product_id?: string | null
          product_name_en: string
          quantity: number
          sku: string
          total_price_slsh: number
          unit_price_slsh: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          pos_transaction_id?: string
          product_id?: string | null
          product_name_en?: string
          quantity?: number
          sku?: string
          total_price_slsh?: number
          unit_price_slsh?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transaction_items_pos_transaction_id_fkey"
            columns: ["pos_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          cashier_id: string
          created_at: string
          customer_id: string | null
          customer_phone: string | null
          discount_amount_slsh: number
          discount_code_id: string | null
          exchange_rate_at_sale: number
          id: string
          location_id: string
          loyalty_points_earned: number
          pos_session_id: string
          status: string
          subtotal_slsh: number
          total_slsh: number
          transaction_number: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          cashier_id: string
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          discount_amount_slsh?: number
          discount_code_id?: string | null
          exchange_rate_at_sale: number
          id?: string
          location_id: string
          loyalty_points_earned?: number
          pos_session_id: string
          status?: string
          subtotal_slsh: number
          total_slsh: number
          transaction_number: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          cashier_id?: string
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          discount_amount_slsh?: number
          discount_code_id?: string | null
          exchange_rate_at_sale?: number
          id?: string
          location_id?: string
          loyalty_points_earned?: number
          pos_session_id?: string
          status?: string
          subtotal_slsh?: number
          total_slsh?: number
          transaction_number?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pos_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pos_transactions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          embedding: string
          embedding_text: string
          id: string
          language: string
          last_embedded_at: string
          model_version: string
          product_id: string
        }
        Insert: {
          embedding: string
          embedding_text: string
          id?: string
          language: string
          last_embedded_at?: string
          model_version?: string
          product_id: string
        }
        Update: {
          embedding?: string
          embedding_text?: string
          id?: string
          language?: string
          last_embedded_at?: string
          model_version?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text_en: string | null
          alt_text_so: string | null
          id: string
          image_url: string
          product_id: string
          sort_order: number
          thumbnail_url: string
        }
        Insert: {
          alt_text_en?: string | null
          alt_text_so?: string | null
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
          thumbnail_url: string
        }
        Update: {
          alt_text_en?: string | null
          alt_text_so?: string | null
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
          thumbnail_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          cost_price_slsh: number
          id: string
          image_url: string | null
          is_active: boolean
          price_slsh: number
          product_id: string
          sku: string
        }
        Insert: {
          attributes?: Json
          cost_price_slsh: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_slsh: number
          product_id: string
          sku: string
        }
        Update: {
          attributes?: Json
          cost_price_slsh?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_slsh?: number
          product_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string
          cost_price_slsh: number
          created_at: string
          created_by: string | null
          description_en: string | null
          description_so: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          name_en: string
          name_so: string
          sku_base: string
          tags: string[]
          unit: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id: string
          cost_price_slsh?: number
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_so?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name_en: string
          name_so: string
          sku_base: string
          tags?: string[]
          unit?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string
          cost_price_slsh?: number
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_so?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name_en?: string
          name_so?: string
          sku_base?: string
          tags?: string[]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          is_active: boolean
          location_id: string | null
          phone: string
          preferred_currency: string
          preferred_language: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          is_active?: boolean
          location_id?: string | null
          phone: string
          preferred_currency?: string
          preferred_language?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          is_active?: boolean
          location_id?: string | null
          phone?: string
          preferred_currency?: string
          preferred_language?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          id: string
          order_item_id: string | null
          photo_urls: string[]
          product_id: string | null
          quantity: number
          reason: string
          return_id: string
          variant_id: string | null
        }
        Insert: {
          id?: string
          order_item_id?: string | null
          photo_urls?: string[]
          product_id?: string | null
          quantity: number
          reason: string
          return_id: string
          variant_id?: string | null
        }
        Update: {
          id?: string
          order_item_id?: string | null
          photo_urls?: string[]
          product_id?: string | null
          quantity?: number
          reason?: string
          return_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          location_id: string
          mobile_money_phone: string | null
          order_id: string | null
          pos_transaction_id: string | null
          processed_at: string | null
          processed_by: string | null
          refund_amount_slsh: number | null
          refund_method: string | null
          refund_reference: string | null
          rejection_reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          location_id: string
          mobile_money_phone?: string | null
          order_id?: string | null
          pos_transaction_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          refund_amount_slsh?: number | null
          refund_method?: string | null
          refund_reference?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          location_id?: string
          mobile_money_phone?: string | null
          order_id?: string | null
          pos_transaction_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          refund_amount_slsh?: number | null
          refund_method?: string | null
          refund_reference?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "returns_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_pos_transaction_id_fkey"
            columns: ["pos_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          attempt_count: number
          created_at: string
          error_code: string | null
          id: string
          message_text: string
          recipient_phone: string
          reference_id: string | null
          reference_type: string | null
          status: string
          trigger_event: string
          twilio_sid: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          id?: string
          message_text: string
          recipient_phone: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          trigger_event: string
          twilio_sid?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          id?: string
          message_text?: string
          recipient_phone?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          trigger_event?: string
          twilio_sid?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          location_id: string
          movement_type: string
          notes: string | null
          performed_by: string | null
          product_id: string
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          product_id: string
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          product_id?: string
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktake_items: {
        Row: {
          counted_quantity: number
          discrepancy: number | null
          id: string
          notes: string | null
          product_id: string
          stocktake_id: string
          system_quantity: number
          variant_id: string | null
        }
        Insert: {
          counted_quantity: number
          discrepancy?: number | null
          id?: string
          notes?: string | null
          product_id: string
          stocktake_id: string
          system_quantity: number
          variant_id?: string | null
        }
        Update: {
          counted_quantity?: number
          discrepancy?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          stocktake_id?: string
          system_quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stocktake_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocktake_items_stocktake_id_fkey"
            columns: ["stocktake_id"]
            isOneToOne: false
            referencedRelation: "stocktakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocktake_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktakes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          initiated_by: string
          location_id: string
          rejection_reason: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          initiated_by: string
          location_id: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          initiated_by?: string
          location_id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stocktakes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stocktakes_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stocktakes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_loyalty_tier: {
        Args: { p_lifetime_points: number }
        Returns: string
      }
      check_discount_code_validity: {
        Args: { p_code: string; p_customer_id: string; p_order_total: number }
        Returns: {
          discount_amount_slsh: number
          error_message: string
          is_valid: boolean
        }[]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      expire_parked_transactions: { Args: never; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      generate_pickup_code: { Args: never; Returns: string }
      generate_pos_transaction_number: { Args: never; Returns: string }
      get_category_tree: {
        Args: never
        Returns: {
          icon_url: string
          id: string
          is_active: boolean
          name_en: string
          name_so: string
          parent_id: string
          sort_order: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      match_products_semantic: {
        Args: {
          match_limit?: number
          p_location_id?: string
          query_embedding: string
        }
        Returns: {
          product_id: string
          similarity: number
        }[]
      }
      release_expired_reservations: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_location_id: { Args: never; Returns: string }
      user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
