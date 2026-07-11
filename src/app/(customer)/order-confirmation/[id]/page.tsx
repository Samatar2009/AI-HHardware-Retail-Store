'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Share2 } from 'lucide-react'

import { formatSLSH } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useOrderRealtime } from '@/hooks/use-order-realtime'
import { Button } from '@/components/ui/button'
import type { Row } from '@/types/database'

type Order = Row<'orders'>

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [isSendingPayment, setIsSendingPayment] = useState(false)

  const { data } = useQuery({
    queryKey: ['order', params.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data: orderData } = await supabase.from('orders').select('*').eq('id', params.id).single()
      let mobileMoneySettings = null
      if (orderData && orderData.payment_method !== 'cash_on_pickup') {
        const { data: mm } = await supabase
          .from('mobile_money_settings')
          .select('*')
          .eq('location_id', orderData.location_id)
          .eq('provider', orderData.payment_method)
          .eq('is_active', true)
          .maybeSingle()
        mobileMoneySettings = mm
      }
      return { order: orderData, mobileMoneySettings }
    },
  })

  useEffect(() => {
    if (data?.order) setOrder(data.order)
  }, [data])

  useOrderRealtime(params.id, (updated) => setOrder(updated))

  async function handlePaymentSent() {
    setIsSendingPayment(true)
    try {
      await fetch(`/api/orders/${params.id}/payment-sent`, { method: 'POST' })
    } finally {
      setIsSendingPayment(false)
    }
  }

  function handleWhatsAppShare() {
    if (!order) return
    const message = `Order ${order.order_number} — Pickup code: ${order.pickup_code}. Picking up from Borama Hardware.`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (!order) return null

  const isMobileMoney = order.payment_method !== 'cash_on_pickup'
  const paymentConfirmed = order.payment_status === 'confirmed'
  const paymentSubmitted = order.payment_status === 'submitted'

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center sm:px-6">
      <div className="mb-4 flex justify-center">
        <CheckCircle2 className="animate-checkmark-pop size-16 text-green-500" aria-hidden="true" />
      </div>

      <p className="text-2xl font-bold text-stone-900">Order #{order.order_number}</p>

      <div className="my-6 rounded-md border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-500">Pickup Code</p>
        <p className="text-5xl font-bold tracking-widest text-orange-600">{order.pickup_code}</p>
      </div>

      {isMobileMoney && data?.mobileMoneySettings && (
        <div className="mb-6 rounded-md bg-stone-50 p-4 text-left text-sm text-stone-700">
          <p className="mb-2 font-semibold">Payment Instructions</p>
          <p>
            Send <strong>{formatSLSH(order.total_slsh)}</strong> to {order.payment_method} number{' '}
            <strong>{data.mobileMoneySettings.merchant_number}</strong>. Use your order number as reference.
          </p>
          <p className="mt-2 text-xs text-stone-500">{data.mobileMoneySettings.instructions_en}</p>
        </div>
      )}

      {isMobileMoney && (
        <div className="mb-6">
          {paymentConfirmed ? (
            <div className="flex items-center justify-center gap-2 rounded-md bg-green-50 p-4 text-green-700">
              <CheckCircle2 className="size-5" />
              Payment Confirmed!
            </div>
          ) : paymentSubmitted ? (
            <div className="flex items-center justify-center gap-2 rounded-md bg-amber-50 p-4 text-amber-700">
              <Clock className="size-5 animate-spin" />
              Waiting for payment confirmation...
            </div>
          ) : (
            <Button variant="primary" size="lg" onClick={handlePaymentSent} loading={isSendingPayment}>
              I Have Sent Payment
            </Button>
          )}
        </div>
      )}

      <Button variant="secondary" onClick={handleWhatsAppShare} className="mb-4 w-full">
        <Share2 className="size-4" />
        Share with someone collecting for you
      </Button>

      <button
        type="button"
        onClick={() => router.push('/orders')}
        className="text-sm font-medium text-orange-600 hover:text-orange-700"
      >
        View My Orders
      </button>
    </div>
  )
}
