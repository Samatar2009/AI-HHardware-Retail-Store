'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { SearchInput } from '@/components/forms/search-input'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface ForecastRow {
  id: string
  product_id: string
  variant_id: string
  predicted_stockout_date: string
  recommended_reorder_qty: number
  confidence_score: number
  reasoning_text: string
  generated_at: string
  product: { name_en: string } | null
  variant: { sku: string } | null
}

interface VariantOption {
  id: string
  sku: string
}

interface ProductOption {
  id: string
  name_en: string
  sku_base: string
  product_variants: VariantOption[]
}

export default function InventoryForecastsPage() {
  const [forecasts, setForecasts] = useState<ForecastRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductOption[]>([])

  useEffect(() => {
    void loadForecasts()
  }, [])

  async function loadForecasts() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/forecasts')
      if (res.ok) {
        const data = (await res.json()) as { forecasts: ForecastRow[] }
        setForecasts(data.forecasts)
      }
    } finally {
      setIsLoading(false)
    }
  }

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

  async function generateForecast(productId: string, variantId: string) {
    const key = `${productId}:${variantId}`
    setRefreshingKey(key)
    try {
      const res = await fetch('/api/inventory/forecasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not generate forecast')
        return
      }
      showSuccessToast('Forecast generated')
      setResults([])
      setQuery('')
      void loadForecasts()
    } finally {
      setRefreshingKey(null)
    }
  }

  return (
    <div>
      <PageHeader title="AI Reorder Forecasts" subtitle="Gemini-powered stockout predictions" />

      <Card className="mb-6">
        <CardContent>
          <p className="mb-2 text-sm font-medium text-stone-700">Generate a new forecast</p>
          <SearchInput
            value={query}
            onSearch={runSearch}
            placeholder="Search product by name or SKU..."
          />
          {results.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {results.map((product) =>
                product.product_variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => void generateForecast(product.id, variant.id)}
                    className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-left text-sm hover:bg-stone-50"
                  >
                    <span>
                      {product.name_en} <span className="text-stone-400">({variant.sku})</span>
                    </span>
                    <Sparkles className="size-4 text-orange-500" />
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-stone-500">Loading...</p>
          ) : forecasts.length === 0 ? (
            <p className="text-sm text-stone-500">No forecasts generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Predicted Stockout</TableHead>
                  <TableHead>Reorder Qty</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Reasoning</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts.map((f) => {
                  const key = `${f.product_id}:${f.variant_id}`
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        {f.product?.name_en}{' '}
                        <span className="text-xs text-stone-400">({f.variant?.sku})</span>
                      </TableCell>
                      <TableCell>{f.predicted_stockout_date}</TableCell>
                      <TableCell>{f.recommended_reorder_qty}</TableCell>
                      <TableCell>{Math.round(f.confidence_score * 100)}%</TableCell>
                      <TableCell className="max-w-xs truncate" title={f.reasoning_text}>
                        {f.reasoning_text}
                      </TableCell>
                      <TableCell>{formatDate(f.generated_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={refreshingKey === key}
                          onClick={() => void generateForecast(f.product_id, f.variant_id)}
                        >
                          <RefreshCw className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
