'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { formatSLSH, slshToUsd } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useCartStore } from '@/stores/cart.store'
import { useCurrencyStore } from '@/stores/currency.store'
import { createClient } from '@/lib/supabase/client'
import { PhoneInput } from '@/components/forms/phone-input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { showErrorToast } from '@/components/ui/toast'
import { E164_SOMALILAND_PATTERN } from '@/lib/validators'

interface MobileMoneySetting {
  provider: string
  merchant_number: string
  instructions_en: string
  location_id: string
}

const PAYMENT_OPTIONS: {
  value: 'zaad' | 'edahab' | 'evc_plus' | 'sahal' | 'cash_on_pickup'
  label: string
}[] = [
  { value: 'zaad', label: 'Zaad' },
  { value: 'edahab', label: 'eDahab' },
  { value: 'evc_plus', label: 'EVC Plus' },
  { value: 'sahal', label: 'Sahal' },
  { value: 'cash_on_pickup', label: 'Cash on Pickup' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const exchangeRate = useCurrencyStore((s) => s.exchangeRate)

  const items = useCartStore((s) => s.items)
  const locationId = useCartStore((s) => s.locationId)
  const appliedCode = useCartStore((s) => s.appliedCode)
  const loyaltyRedemption = useCartStore((s) => s.loyaltyRedemption)
  const clearCart = useCartStore((s) => s.clearCart)

  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_OPTIONS)[number]['value']>('cash_on_pickup')
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState(profile?.phone ?? '+252')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/sign-in?next=/checkout')
      return
    }
    if (items.length === 0) router.replace('/cart')
    if (!locationId) router.replace('/cart')
  }, [authLoading, user, items.length, locationId, router])

  const { data: mobileMoneySettings } = useQuery({
    queryKey: ['mobile-money-settings', locationId],
    enabled: !!locationId && paymentMethod !== 'cash_on_pickup',
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('mobile_money_settings')
        .select('provider, merchant_number, instructions_en, location_id')
        .eq('location_id', locationId!)
        .eq('is_active', true)
      return (data ?? []) as MobileMoneySetting[]
    },
  })

  const selectedProviderSettings = mobileMoneySettings?.find((m) => m.provider === paymentMethod)

  const subtotal = items.reduce((sum, item) => sum + item.unitPriceSlsh * item.quantity, 0)

  // Mobile money payment methods require a real Somaliland number to send
  // from — mobileMoneyPhone defaults to profile.phone, which can itself be
  // a non-Somaliland number (e.g. a dev-only test account), so this can't
  // be assumed valid just because a value is present. Catching it here
  // (like sign-in's phone check) avoids silently sending an unvalidatable
  // order to the API and surfacing only a generic "Invalid order data".
  const isMobileMoneyPhoneRequired = paymentMethod !== 'cash_on_pickup'
  const isMobileMoneyPhoneValid =
    !isMobileMoneyPhoneRequired || E164_SOMALILAND_PATTERN.test(mobileMoneyPhone)

  async function handlePlaceOrder() {
    if (!locationId || !isMobileMoneyPhoneValid) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          paymentMethod,
          mobileMoneyPhone: paymentMethod !== 'cash_on_pickup' ? mobileMoneyPhone : undefined,
          discountCode: appliedCode ?? undefined,
          redeemLoyalty: !!loyaltyRedemption,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        // The client-side checks above should catch a bad mobileMoneyPhone
        // before this point, but surface the API's field-specific detail
        // (if present) rather than the generic message as a fallback.
        const fieldError = data.details?.fieldErrors?.mobileMoneyPhone?.[0]
        const message = fieldError
          ? 'Enter a valid Somaliland phone number to send payment from.'
          : (data.error ?? 'Could not place your order. Please try again.')
        setSubmitError(message)
        showErrorToast('Order failed', message)
        return
      }

      clearCart()
      // Replace (not push) so the browser back button skips checkout —
      // App Flow doc 3.7: back from confirmation goes to homepage, never
      // back to a re-submittable checkout form.
      router.replace(`/order-confirmation/${data.orderId}`)
    } catch {
      setSubmitError('Could not place your order. Please try again.')
      showErrorToast('Order failed', 'Could not place your order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user || items.length === 0 || !locationId) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">Checkout</h1>

      <div className="flex flex-col gap-6">
        <section className="rounded-md border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-900">Pickup Location</p>
            <button
              type="button"
              onClick={() => router.push('/cart')}
              className="text-xs font-medium text-orange-600"
            >
              Change
            </button>
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-stone-900">Contact Details</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Phone number</label>
              <p className="text-sm text-stone-500">{profile?.phone}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-stone-900">Payment Method</p>
          <div className="flex flex-col gap-2">
            {PAYMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  className="size-4 text-orange-500"
                />
                <span className="text-sm font-medium text-stone-700">{option.label}</span>
              </label>
            ))}
          </div>

          {paymentMethod !== 'cash_on_pickup' && (
            <div className="mt-4 flex flex-col gap-3">
              {selectedProviderSettings && (
                <div className="rounded-md bg-stone-50 p-3 text-sm text-stone-600">
                  Send to: <strong>{selectedProviderSettings.merchant_number}</strong>
                  <p className="mt-1 text-xs">{selectedProviderSettings.instructions_en}</p>
                </div>
              )}
              <PhoneInput
                value={mobileMoneyPhone}
                onChange={setMobileMoneyPhone}
                label="Which number did you send from?"
                error={
                  !isMobileMoneyPhoneValid ? 'Enter a valid Somaliland phone number' : undefined
                }
              />
            </div>
          )}
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-4">
          <Textarea
            label="Order notes"
            placeholder="Any special instructions for pickup?"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-stone-900">Order Summary</p>
          <div className="flex flex-col gap-1 text-sm">
            {items.map((item) => (
              <div
                key={`${item.productId}:${item.variantId ?? ''}`}
                className="flex justify-between text-stone-600"
              >
                <span>
                  {item.nameEn} × {item.quantity}
                </span>
                <span>{formatSLSH(item.unitPriceSlsh * item.quantity)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-bold text-stone-900">
              <span>Subtotal</span>
              <div className="text-right">
                <p>{formatSLSH(subtotal)}</p>
                {exchangeRate > 0 && (
                  <p className="text-xs font-normal text-stone-500">
                    {slshToUsd(subtotal, exchangeRate)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <Button
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting || !isMobileMoneyPhoneValid}
          onClick={handlePlaceOrder}
        >
          Place Order
        </Button>
      </div>
    </div>
  )
}
