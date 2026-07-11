'use client'

import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/types/database'

type Order = Row<'orders'>

/** Subscribes to live UPDATEs on a single order row via Supabase Realtime. */
function useOrderRealtime(orderId: string, onUpdate: (order: Order) => void) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => onUpdate(payload.new as Order)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])
}

export { useOrderRealtime }
