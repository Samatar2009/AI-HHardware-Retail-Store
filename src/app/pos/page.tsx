'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Minus, Plus, Trash2, User, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { showErrorToast, showSuccessToast } from '@/components/ui/toast'
import { BarcodeScanner } from '@/components/inventory/barcode-scanner'
import { PaymentModal } from '@/components/pos/payment-modal'
import { CloseSessionDialog } from '@/components/pos/close-session-dialog'
import { VoidDialog } from '@/components/pos/void-dialog'
import { PickupPanel } from '@/components/pos/pickup-panel'
import { formatSLSH } from '@/lib/utils'
import { usePosStore } from '@/stores/pos.store'
import type { PosSession } from '@/types/pos'

export interface PosCartItem {
  variantId: string
  productId: string
  nameEn: string
  sku: string
  attributes: Record<string, string>
  quantity: number
  unitPriceSlsh: number
  available: number
}

interface SearchResult {
  variantId: string
  productId: string
  nameEn: string
  nameSo: string
  sku: string
  priceSlsh: number
  attributes: Record<string, string>
  available: number
}

interface CustomerResult {
  userId: string
  fullName: string | null
  phone: string
  loyaltyCard: { card_number: string; current_points: number; current_tier: string } | null
}

interface ParkedCartRow {
  id: string
  parked_at: string
  cart_data: { items: PosCartItem[]; customerPhone: string | null; discountCode: string | null }
}

export default function PosPage() {
  const router = useRouter()
  const activeSession = usePosStore((s) => s.activeSession) as PosSession | null
  const setActiveSession = usePosStore((s) => s.setActiveSession)

  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)

  const [customerPhone, setCustomerPhone] = useState('')
  const [customer, setCustomer] = useState<CustomerResult | null>(null)
  const [linkToSale, setLinkToSale] = useState(true)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const [discountCode, setDiscountCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [isValidatingCode, setIsValidatingCode] = useState(false)

  const [parkedCarts, setParkedCarts] = useState<ParkedCartRow[]>([])
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<{ id: string; transactionNumber: string } | null>(null)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)

  useEffect(() => {
    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function bootstrap() {
    try {
      const res = await fetch('/api/pos/sessions/active')
      if (res.ok) {
        const data = (await res.json()) as { session: PosSession | null }
        if (!data.session) {
          router.replace('/pos/open-session')
          return
        }
        setActiveSession(data.session)
        void loadParkedCarts()
      }
    } finally {
      setIsCheckingSession(false)
    }
  }

  async function loadParkedCarts() {
    const res = await fetch('/api/pos/park')
    if (res.ok) {
      const data = (await res.json()) as { parked: ParkedCartRow[] }
      setParkedCarts(data.parked)
    }
  }

  async function runSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 1) {
      setResults([])
      return
    }
    const res = await fetch(`/api/pos/products/search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = (await res.json()) as { results: SearchResult[] }
      setResults(data.results)
    }
  }

  function addToCart(item: SearchResult) {
    setCart((prev) => {
      const existing = prev.find((c) => c.variantId === item.variantId)
      if (existing) {
        return prev.map((c) => (c.variantId === item.variantId ? { ...c, quantity: c.quantity + 1 } : c))
      }
      return [
        ...prev,
        {
          variantId: item.variantId,
          productId: item.productId,
          nameEn: item.nameEn,
          sku: item.sku,
          attributes: item.attributes,
          quantity: 1,
          unitPriceSlsh: item.priceSlsh,
          available: item.available,
        },
      ]
    })
    setResults([])
    setQuery('')
  }

  async function handleScan(sku: string) {
    const res = await fetch(`/api/pos/products/barcode/${encodeURIComponent(sku)}`)
    if (res.ok) {
      const data = (await res.json()) as { result: SearchResult }
      addToCart(data.result)
      showSuccessToast(`Added: ${data.result.nameEn}`)
    } else {
      showErrorToast(`No product found for SKU ${sku}`)
    }
  }

  function updateQty(variantId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.variantId !== variantId))
      return
    }
    setCart((prev) => prev.map((c) => (c.variantId === variantId ? { ...c, quantity } : c)))
  }

  function removeItem(variantId: string) {
    setCart((prev) => prev.filter((c) => c.variantId !== variantId))
  }

  async function lookupCustomer() {
    if (!customerPhone) return
    setIsLookingUp(true)
    try {
      const res = await fetch(`/api/pos/customer-lookup?phone=${encodeURIComponent(customerPhone)}`)
      if (res.ok) {
        const data = (await res.json()) as { customer: CustomerResult | null }
        if (!data.customer) {
          showErrorToast('No customer found for this number')
        }
        setCustomer(data.customer)
      }
    } finally {
      setIsLookingUp(false)
    }
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPriceSlsh * item.quantity, 0), [cart])
  const total = Math.max(0, subtotal - discountAmount)

  async function applyDiscountCode() {
    if (!discountCode || subtotal === 0) return
    setIsValidatingCode(true)
    try {
      const res = await fetch('/api/orders/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode,
          orderTotalSlsh: subtotal,
          customerId: linkToSale && customer ? customer.userId : undefined,
        }),
      })
      const data = (await res.json()) as { isValid: boolean; discountAmountSlsh: number; errorMessage: string | null }
      if (!data.isValid) {
        showErrorToast(data.errorMessage ?? 'Invalid discount code')
        setDiscountAmount(0)
        return
      }
      setDiscountAmount(data.discountAmountSlsh)
      showSuccessToast(`Discount applied: ${formatSLSH(data.discountAmountSlsh)}`)
    } finally {
      setIsValidatingCode(false)
    }
  }

  function clearCart() {
    setCart([])
    setCustomer(null)
    setCustomerPhone('')
    setDiscountCode('')
    setDiscountAmount(0)
  }

  async function parkCart() {
    if (cart.length === 0 || !activeSession) return
    const res = await fetch('/api/pos/park', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        posSessionId: activeSession.id,
        locationId: activeSession.location_id,
        cartData: {
          items: cart,
          customerPhone: linkToSale ? customer?.phone ?? null : null,
          discountCode: discountCode || null,
        },
      }),
    })
    if (!res.ok) {
      showErrorToast('Could not park cart')
      return
    }
    showSuccessToast('Cart parked')
    clearCart()
    void loadParkedCarts()
  }

  async function recallCart(parked: ParkedCartRow) {
    const res = await fetch(`/api/pos/parked/${parked.id}/recall`, { method: 'PATCH' })
    if (!res.ok) {
      showErrorToast('Could not recall cart')
      return
    }
    setCart(parked.cart_data.items)
    if (parked.cart_data.customerPhone) {
      setCustomerPhone(parked.cart_data.customerPhone)
    }
    if (parked.cart_data.discountCode) {
      setDiscountCode(parked.cart_data.discountCode)
    }
    void loadParkedCarts()
  }

  function handleTransactionComplete(transaction: { id: string; transactionNumber: string } | null) {
    clearCart()
    setPaymentModalOpen(false)
    // A queued offline sale has no server-assigned id yet, so it can't be
    // voided until it syncs — leave lastTransaction untouched.
    if (transaction) setLastTransaction(transaction)
    void loadParkedCarts()
  }

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'F1') {
        e.preventDefault()
        void parkCart()
      } else if (e.key === 'F2') {
        e.preventDefault()
        clearCart()
      } else if (e.key === 'F3') {
        e.preventDefault()
        if (lastTransaction) setVoidDialogOpen(true)
      } else if (e.key === 'F4') {
        e.preventDefault()
        clearCart()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, activeSession, lastTransaction])

  if (isCheckingSession) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="sale" className="flex h-full flex-col">
      <div className="border-b border-stone-800 px-4">
        <TabsList className="border-none">
          <TabsTrigger value="sale" className="text-stone-400 data-[state=active]:text-orange-500">
            Sale
          </TabsTrigger>
          <TabsTrigger value="pickup" className="text-stone-400 data-[state=active]:text-orange-500">
            Pickup
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sale" className="mt-0 flex flex-1 overflow-hidden">
        <div className="flex w-3/5 flex-col border-r border-stone-800 p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                autoFocus
                value={query}
                onChange={(e) => void runSearch(e.target.value)}
                placeholder="Search by name or SKU..."
                className="h-12 w-full rounded-md border border-stone-700 bg-stone-900 px-4 text-base text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
              />
              {results.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-stone-700 bg-stone-900">
                  {results.map((r) => (
                    <button
                      key={r.variantId}
                      onClick={() => addToCart(r)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-white hover:bg-stone-800"
                    >
                      <span>
                        {r.nameEn} <span className="text-stone-500">({r.sku})</span>
                      </span>
                      <span className="text-orange-500">{formatSLSH(r.priceSlsh)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="secondary" size="icon" onClick={() => setScannerOpen(true)} aria-label="Scan barcode">
              <Camera className="size-4" />
            </Button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="mt-10 text-center text-stone-500">Cart is empty</p>
            ) : (
              <div className="flex flex-col gap-2">
                {cart.map((item) => (
                  <div key={item.variantId} className="flex items-center justify-between rounded-md border border-stone-800 bg-stone-900 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{item.nameEn}</p>
                      <p className="text-xs text-stone-500">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.variantId, item.quantity - 1)} className="rounded-full bg-stone-800 p-1 text-white">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-white">{item.quantity}</span>
                      <button onClick={() => updateQty(item.variantId, item.quantity + 1)} className="rounded-full bg-stone-800 p-1 text-white">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <p className="w-24 text-right text-sm text-white">{formatSLSH(item.unitPriceSlsh * item.quantity)}</p>
                    <button onClick={() => removeItem(item.variantId)} className="ml-2 text-stone-500 hover:text-red-500">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 border-t border-stone-800 pt-4">
            <Button variant="secondary" onClick={() => void parkCart()} disabled={cart.length === 0}>
              Park Cart (F1)
            </Button>
            <Button variant="secondary" onClick={clearCart} disabled={cart.length === 0}>
              Clear Cart (F2)
            </Button>
            <Button variant="secondary" onClick={() => setVoidDialogOpen(true)} disabled={!lastTransaction}>
              Void Last (F3)
            </Button>
            <Button variant="secondary" onClick={clearCart}>
              New Sale (F4)
            </Button>
            <Button variant="secondary" onClick={() => setCloseDialogOpen(true)} className="ml-auto">
              Close Register
            </Button>
          </div>

          {parkedCarts.length > 0 && (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Parked Carts ({parkedCarts.length})</p>
              <div className="flex flex-wrap gap-2">
                {parkedCarts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void recallCart(p)}
                    className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-left text-xs text-white hover:border-orange-500"
                  >
                    {p.cart_data.items.length} item(s) · {new Date(p.parked_at).toLocaleTimeString()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex w-2/5 flex-col p-4">
          <div className="rounded-md border border-stone-800 bg-stone-900 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-300">
              <User className="size-4" /> Customer
            </p>
            {customer ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{customer.fullName || customer.phone}</p>
                  {customer.loyaltyCard && (
                    <p className="text-xs text-stone-400">
                      {customer.loyaltyCard.current_points} pts · {customer.loyaltyCard.current_tier}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCustomer(null)
                    setCustomerPhone('')
                  }}
                  className="text-stone-500 hover:text-red-500"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="border-stone-700 bg-stone-800 text-white"
                />
                <Button variant="secondary" onClick={() => void lookupCustomer()} loading={isLookingUp}>
                  Lookup
                </Button>
              </div>
            )}
            {customer && (
              <label className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                <input type="checkbox" checked={linkToSale} onChange={(e) => setLinkToSale(e.target.checked)} />
                Link to sale (award loyalty points)
              </label>
            )}
          </div>

          <div className="mt-4 rounded-md border border-stone-800 bg-stone-900 p-4">
            <p className="mb-2 text-sm font-semibold text-stone-300">Discount Code</p>
            <div className="flex gap-2">
              <Input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="border-stone-700 bg-stone-800 text-white"
              />
              <Button variant="secondary" onClick={() => void applyDiscountCode()} loading={isValidatingCode}>
                Apply
              </Button>
            </div>
          </div>

          <div className="mt-4 flex-1 rounded-md border border-stone-800 bg-stone-900 p-4">
            <div className="flex justify-between text-sm text-stone-400">
              <span>Subtotal</span>
              <span>{formatSLSH(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>Discount</span>
                <span>-{formatSLSH(discountAmount)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-stone-800 pt-2 text-lg font-bold text-white">
              <span>Total</span>
              <span>{formatSLSH(total)}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="mt-4 bg-green-600 hover:bg-green-700"
            disabled={cart.length === 0}
            onClick={() => setPaymentModalOpen(true)}
          >
            Charge {formatSLSH(total)}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="pickup" className="mt-0 flex-1 overflow-y-auto p-6">
        <PickupPanel />
      </TabsContent>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={(sku) => void handleScan(sku)} />

      {activeSession && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          session={activeSession}
          cart={cart}
          customer={linkToSale ? customer : null}
          discountCode={discountAmount > 0 ? discountCode : ''}
          discountAmountSlsh={discountAmount}
          total={total}
          subtotal={subtotal}
          onComplete={handleTransactionComplete}
        />
      )}

      {activeSession && <CloseSessionDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} session={activeSession} />}

      <VoidDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        transactionId={lastTransaction?.id ?? null}
        transactionNumber={lastTransaction?.transactionNumber ?? null}
        onVoided={() => setLastTransaction(null)}
      />
    </Tabs>
  )
}
