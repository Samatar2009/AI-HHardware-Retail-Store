'use client'

import { useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SearchInput } from '@/components/forms/search-input'
import { PriceInput } from '@/components/forms/price-input'
import { BarcodeScanner } from '@/components/inventory/barcode-scanner'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'

interface VariantOption {
  id: string
  sku: string
  attributes: Record<string, string>
  is_active: boolean
}

interface ProductOption {
  id: string
  name_en: string
  sku_base: string
  product_variants: VariantOption[]
}

interface BatchItem {
  key: string
  productId: string
  productName: string
  variantId: string
  variantSku: string
  quantity: number
  costPriceSlsh: number
  notes?: string
}

export default function InventoryReceivePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductOption[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costPrice, setCostPrice] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState('')

  const [batch, setBatch] = useState<BatchItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function runSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    const res = await fetch(`/api/inventory/product-search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = (await res.json()) as { products: ProductOption[] }
      setResults(data.products)
    }
  }

  async function handleScan(sku: string) {
    const res = await fetch(`/api/inventory/product-search?q=${encodeURIComponent(sku)}`)
    if (res.ok) {
      const data = (await res.json()) as { products: ProductOption[] }
      const match = data.products.find((p) => p.product_variants.some((v) => v.sku === sku))
      if (match) {
        selectProduct(match)
        const variant = match.product_variants.find((v) => v.sku === sku)
        if (variant) setSelectedVariantId(variant.id)
        showSuccessToast(`Found: ${match.name_en}`)
      } else {
        showErrorToast(`No product found for SKU ${sku}`)
      }
    }
  }

  function selectProduct(product: ProductOption) {
    setSelectedProduct(product)
    setSelectedVariantId(product.product_variants[0]?.id ?? '')
    setResults([])
    setQuery('')
  }

  function addToBatch() {
    if (!selectedProduct || !selectedVariantId || !quantity || costPrice === undefined) return
    const variant = selectedProduct.product_variants.find((v) => v.id === selectedVariantId)
    if (!variant) return

    setBatch((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: selectedProduct.id,
        productName: selectedProduct.name_en,
        variantId: variant.id,
        variantSku: variant.sku,
        quantity: Number(quantity),
        costPriceSlsh: costPrice,
        notes: notes || undefined,
      },
    ])

    setSelectedProduct(null)
    setSelectedVariantId('')
    setQuantity('')
    setCostPrice(undefined)
    setNotes('')
  }

  function removeFromBatch(key: string) {
    setBatch((prev) => prev.filter((i) => i.key !== key))
  }

  async function submitBatch() {
    if (batch.length === 0) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: batch.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            costPriceSlsh: item.costPriceSlsh,
            notes: item.notes,
          })),
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not receive stock')
        return
      }
      showSuccessToast(`Received ${batch.length} item(s)`)
      setBatch([])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Receive Stock"
        subtitle="Search or scan a product, then add it to this delivery"
      />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <SearchInput
                value={query}
                onSearch={runSearch}
                placeholder="Search by product name or SKU..."
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setScannerOpen(true)}
                aria-label="Scan barcode"
              >
                <Camera className="size-4" />
              </Button>
            </div>

            {results.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-stone-200">
                {results.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50"
                  >
                    <span>{product.name_en}</span>
                    <span className="text-xs text-stone-400">{product.sku_base}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedProduct && (
              <div className="mt-4 flex flex-col gap-4 border-t border-stone-100 pt-4">
                <p className="font-medium text-stone-900">{selectedProduct.name_en}</p>

                {selectedProduct.product_variants.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.product_variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`rounded-md border px-3 py-1.5 text-sm ${
                          selectedVariantId === v.id
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-stone-300 text-stone-700'
                        }`}
                      >
                        {v.sku}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quantity Received"
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <PriceInput
                    label="Cost Price (SLSH)"
                    required
                    value={costPrice}
                    onChange={setCostPrice}
                  />
                </div>
                <Textarea
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <Button
                  onClick={addToBatch}
                  disabled={!selectedVariantId || !quantity || costPrice === undefined}
                >
                  Add to Delivery
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-2 font-medium text-stone-900">
              This Delivery ({batch.length} item{batch.length === 1 ? '' : 's'})
            </p>
            {batch.length === 0 ? (
              <p className="text-sm text-stone-500">No items added yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {batch.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-md border border-stone-200 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{item.productName}</p>
                      <p className="text-xs text-stone-500">
                        {item.variantSku} · Qty {item.quantity} · {item.costPriceSlsh} SLSH each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromBatch(item.key)}
                      aria-label="Remove item"
                      className="text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <Button onClick={() => void submitBatch()} loading={isSubmitting} className="mt-2">
                  Submit Delivery
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(sku) => void handleScan(sku)}
      />
    </div>
  )
}
