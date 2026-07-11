'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Image as ImageIcon, X } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Checkbox } from '@/components/ui/checkbox'
import { SimpleSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'
import type { Row } from '@/types/database'

type OrderItem = Row<'order_items'>
type Order = Row<'orders'>

const REASON_OPTIONS = [
  { value: 'wrong_item', label: 'Wrong item delivered' },
  { value: 'defective', label: 'Defective' },
  { value: 'not_as_described', label: 'Product not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
]

const REFUND_OPTIONS = [
  { value: 'original_payment', label: 'Refund to original payment method' },
  { value: 'cash', label: 'Cash refund at store' },
  { value: 'store_credit', label: 'Store credit (loyalty points)' },
]

interface ItemState {
  quantity: number
  reason: string
  photos: File[]
}

export default function NewReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const { user } = useAuth()

  const [selected, setSelected] = useState<Record<string, ItemState>>({})
  const [refundMethod, setRefundMethod] = useState('original_payment')
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: order } = useQuery({
    queryKey: ['return-source-order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId!)
        .single()
      return data as (Order & { items: OrderItem[] }) | null
    },
  })

  useEffect(() => {
    if (order?.payment_method && order.payment_method !== 'cash_on_pickup') {
      setRefundMethod('original_payment')
    } else {
      setRefundMethod('cash')
    }
  }, [order])

  function toggleItem(item: OrderItem, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev }
      if (checked) {
        next[item.id] = { quantity: 1, reason: 'defective', photos: [] }
      } else {
        delete next[item.id]
      }
      return next
    })
  }

  function updateItem(itemId: string, patch: Partial<ItemState>) {
    setSelected((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }))
  }

  async function handleSubmit() {
    if (!order || !user || Object.keys(selected).length === 0) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const items = await Promise.all(
        Object.entries(selected).map(async ([orderItemId, state]) => {
          const orderItem = order.items.find((i) => i.id === orderItemId)!
          const photoUrls: string[] = []

          for (let i = 0; i < state.photos.length; i++) {
            const file = state.photos[i]
            const path = `${user.id}/${crypto.randomUUID()}/${i}-${file.name}`
            const { error: uploadError } = await supabase.storage.from('return-photos').upload(path, file)
            if (!uploadError) photoUrls.push(path)
          }

          return {
            orderItemId,
            productId: orderItem.product_id,
            variantId: orderItem.variant_id,
            quantity: state.quantity,
            reason: state.reason,
            photoUrls,
          }
        })
      )

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          refundMethod,
          mobileMoneyPhone: refundMethod === 'original_payment' ? mobileMoneyPhone || undefined : undefined,
          items,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showErrorToast('Could not submit return', data.error)
        return
      }

      showSuccessToast('Return request submitted', 'We will contact you within 24 hours.')
      router.push(`/returns/${data.returnId}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!orderId) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-stone-500">No order selected.</div>
  }
  if (!order) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">Return Items</h1>
      <p className="mb-4 text-sm text-stone-500">Order {order.order_number}</p>

      <div className="flex flex-col gap-4">
        {order.items.map((item) => {
          const isSelected = !!selected[item.id]
          const state = selected[item.id]

          return (
            <div key={item.id} className="rounded-md border border-stone-200 bg-white p-4">
              <Checkbox
                label={`${item.product_name_en} (qty ${item.quantity})`}
                checked={isSelected}
                onCheckedChange={(checked) => toggleItem(item, !!checked)}
              />

              {isSelected && state && (
                <div className="mt-3 flex flex-col gap-3 pl-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Quantity to return</label>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={state.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: Math.min(item.quantity, Math.max(1, Number(e.target.value))) })
                      }
                      className="h-10 w-24 rounded-md border border-stone-300 px-3 text-sm"
                    />
                  </div>

                  <SimpleSelect
                    label="Reason"
                    value={state.reason}
                    onValueChange={(value) => updateItem(item.id, { reason: value })}
                    options={REASON_OPTIONS}
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">
                      Photos (optional, up to 3)
                    </label>
                    <div className="flex gap-2">
                      {state.photos.map((file, i) => (
                        <div key={i} className="relative size-16 overflow-hidden rounded-md border border-stone-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, { photos: state.photos.filter((_, idx) => idx !== i) })
                            }
                            className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                      {state.photos.length < 3 && (
                        <label className="flex size-16 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-stone-300 hover:border-stone-400">
                          <ImageIcon className="size-5 text-stone-400" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file && file.size <= 5 * 1024 * 1024) {
                                updateItem(item.id, { photos: [...state.photos, file] })
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-md border border-stone-200 bg-white p-4">
        <SimpleSelect
          label="Refund method"
          value={refundMethod}
          onValueChange={setRefundMethod}
          options={REFUND_OPTIONS}
        />
        {refundMethod === 'original_payment' && order.payment_method !== 'cash_on_pickup' && (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-stone-700">Mobile money number</label>
            <input
              type="tel"
              value={mobileMoneyPhone}
              onChange={(e) => setMobileMoneyPhone(e.target.value)}
              placeholder="+252..."
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
            />
          </div>
        )}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="mt-6"
        disabled={Object.keys(selected).length === 0}
        loading={isSubmitting}
        onClick={handleSubmit}
      >
        Submit Return Request
      </Button>
    </div>
  )
}
