'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Minus, Plus, ShoppingCart, Star, X } from 'lucide-react'

import { cn, formatSLSH, slshToUsd } from '@/lib/utils'
import { useCartStore } from '@/stores/cart.store'
import { useCurrencyStore } from '@/stores/currency.store'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'

interface Location {
  id: string
  name_en: string
  name_so: string
}

interface LoyaltyCard {
  current_points: number
  current_tier: string
}

const MIN_POINTS_TO_REDEEM = 100

export default function CartPage() {
  const router = useRouter()
  const t = useTranslations('cart')
  const { user } = useAuth()
  const exchangeRate = useCurrencyStore((s) => s.exchangeRate)

  const items = useCartStore((s) => s.items)
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const appliedCode = useCartStore((s) => s.appliedCode)
  const applyCode = useCartStore((s) => s.applyCode)
  const loyaltyRedemption = useCartStore((s) => s.loyaltyRedemption)
  const setLoyaltyRedemption = useCartStore((s) => s.setLoyaltyRedemption)
  const locationId = useCartStore((s) => s.locationId)
  const setLocationId = useCartStore((s) => s.setLocationId)

  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [outOfStockIds, setOutOfStockIds] = useState<Set<string>>(new Set())
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const subtotal = items.reduce((sum, item) => sum + item.unitPriceSlsh * item.quantity, 0)

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/locations')
      return (await res.json()) as { locations: Location[] }
    },
  })
  const locations = locationsData?.locations ?? []

  useEffect(() => {
    if (!locationId && locations.length > 0) setLocationId(locations[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations])

  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty-card'],
    enabled: !!user,
    queryFn: async (): Promise<{ card: LoyaltyCard | null; currentTier: { discount_percentage: number } | null }> => {
      const res = await fetch('/api/loyalty/card')
      if (!res.ok) return { card: null, currentTier: null }
      return res.json()
    },
  })
  const loyaltyCard = loyaltyData?.card ?? null
  const tierDiscountPct = loyaltyData?.currentTier?.discount_percentage ?? 0

  const loyaltyDiscount =
    loyaltyRedemption && loyaltyRedemption > 0 ? Math.round(subtotal * (tierDiscountPct / 100)) : 0

  const total = Math.max(0, subtotal - discountAmount - loyaltyDiscount)

  // Re-validate stock whenever items or the selected location changes.
  useEffect(() => {
    if (!locationId || items.length === 0) {
      setOutOfStockIds(new Set())
      return
    }
    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      }),
    })
      .then((res) => res.json())
      .then((data: { items: { productId: string; variantId: string | null; isAvailable: boolean }[] }) => {
        const badIds = new Set(
          data.items.filter((i) => !i.isAvailable).map((i) => `${i.productId}:${i.variantId ?? ''}`)
        )
        setOutOfStockIds(badIds)
      })
      .catch(() => {})
  }, [items, locationId])

  async function handleApplyCode() {
    setCodeError(null)
    if (!codeInput.trim()) return
    if (!user) {
      router.push('/sign-in?next=/cart')
      return
    }
    const res = await fetch('/api/orders/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput.trim(), orderTotalSlsh: subtotal }),
    })
    const data = await res.json()
    if (!data.isValid) {
      setCodeError(data.errorMessage ?? 'Invalid or expired code.')
      return
    }
    applyCode(codeInput.trim())
    setDiscountAmount(data.discountAmountSlsh)
    setLoyaltyRedemption(null)
  }

  function handleRemoveCode() {
    applyCode(null)
    setDiscountAmount(0)
    setCodeInput('')
    setCodeError(null)
  }

  function handleToggleLoyalty(checked: boolean) {
    if (checked) {
      applyCode(null)
      setDiscountAmount(0)
      setLoyaltyRedemption(loyaltyCard?.current_points ?? 0)
    } else {
      setLoyaltyRedemption(null)
    }
  }

  async function handleCheckout() {
    if (!user) {
      router.push('/sign-in?next=/checkout')
      return
    }
    if (!locationId || outOfStockIds.size > 0) return

    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!data.allAvailable) {
        const badIds = new Set(
          (data.items as { productId: string; variantId: string | null; isAvailable: boolean }[])
            .filter((i) => !i.isAvailable)
            .map((i) => `${i.productId}:${i.variantId ?? ''}`)
        )
        setOutOfStockIds(badIds)
        return
      }
      router.push('/checkout')
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState icon={ShoppingCart} title={t('empty')} ctaLabel="Start Shopping" onCtaClick={() => router.push('/')} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">{t('title')}</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {items.map((item) => {
            const isOutOfStock = outOfStockIds.has(`${item.productId}:${item.variantId ?? ''}`)
            return (
              <div
                key={`${item.productId}:${item.variantId ?? ''}`}
                className={cn(
                  'flex gap-4 rounded-md border p-4',
                  isOutOfStock ? 'border-red-300 bg-red-50' : 'border-stone-200 bg-white'
                )}
              >
                <div className="size-20 shrink-0 overflow-hidden rounded-md bg-stone-100">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.nameEn} className="size-full object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-semibold text-stone-900">{item.nameEn}</p>
                  {item.variantAttributes && (
                    <p className="text-xs text-stone-500">{Object.values(item.variantAttributes).join(', ')}</p>
                  )}
                  <p className="text-sm font-bold text-stone-900">{formatSLSH(item.unitPriceSlsh)}</p>
                  {isOutOfStock && (
                    <p className="text-xs font-medium text-red-600">Out of stock at this location. Remove to continue</p>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-stone-300">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateQty(item.productId, item.variantId, Math.max(1, item.quantity - 1))}
                        className="p-1.5 text-stone-600 hover:bg-stone-100"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateQty(item.productId, item.variantId, item.quantity + 1)}
                        className="p-1.5 text-stone-600 hover:bg-stone-100"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="text-xs font-medium text-stone-500 hover:text-red-600"
                    >
                      {t('removeItem')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-6 rounded-md border border-stone-200 bg-white p-6">
          <div>
            <p className="mb-1.5 text-sm font-medium text-stone-700">Pickup Location</p>
            <SimpleSelect
              value={locationId ?? undefined}
              onValueChange={setLocationId}
              options={locations.map((l) => ({ value: l.id, label: l.name_en }))}
              placeholder="Select a branch"
            />
          </div>

          {appliedCode ? (
            <div className="flex items-center justify-between rounded-md bg-green-50 p-3 text-sm text-green-700">
              <span>{appliedCode} applied (-{formatSLSH(discountAmount)})</span>
              <button type="button" onClick={handleRemoveCode} aria-label="Remove code">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <Input
                  placeholder="Discount code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  error={codeError ?? undefined}
                />
                <Button variant="secondary" onClick={handleApplyCode}>
                  Apply
                </Button>
              </div>
            </div>
          )}

          {user && loyaltyCard && loyaltyCard.current_points >= MIN_POINTS_TO_REDEEM && !appliedCode && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-stone-700">
                <Star className="size-4 text-orange-500" />
                Redeem {loyaltyCard.current_points} points for {tierDiscountPct}% off
              </div>
              <Switch checked={!!loyaltyRedemption} onCheckedChange={handleToggleLoyalty} />
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-stone-200 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">{t('subtotal')}</span>
              <span className="font-medium text-stone-900">{formatSLSH(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatSLSH(discountAmount)}</span>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Loyalty discount</span>
                <span>-{formatSLSH(loyaltyDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-500">
              <span>Delivery</span>
              <span>Free — in-store pickup</span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
              <span>Total</span>
              <div className="text-right">
                <p>{formatSLSH(total)}</p>
                {exchangeRate > 0 && <p className="text-xs font-normal text-stone-500">{slshToUsd(total, exchangeRate)}</p>}
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={!locationId || outOfStockIds.size > 0}
            loading={isCheckingOut}
            onClick={handleCheckout}
          >
            {t('checkout')}
          </Button>
        </div>
      </div>
    </div>
  )
}
