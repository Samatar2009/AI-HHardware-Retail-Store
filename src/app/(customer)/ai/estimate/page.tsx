'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Hammer, Download, ShoppingCart } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { formatSLSH, slshToUsd } from '@/lib/utils'
import { useCartStore } from '@/stores/cart.store'
import { useCurrencyStore } from '@/stores/currency.store'

interface EstimateMaterial {
  name: string
  quantity: number
  unit: string
  unit_price_slsh: number
  total_slsh: number
  matchedProductId: string | null
  matchedVariantId: string | null
  matchedSku: string | null
  matchedNameEn: string | null
  matchedNameSo: string | null
  matchedImageUrl: string | null
}

interface EstimateResult {
  projectType: string
  materials: EstimateMaterial[]
  totalSlsh: number
  notes: string
}

export default function CustomerAiEstimatePage() {
  const locale = useLocale() as 'en' | 'so'
  const exchangeRate = useCurrencyStore((s) => s.exchangeRate)
  const addItem = useCartStore((s) => s.addItem)

  const [description, setDescription] = useState('')
  const [areaSqm, setAreaSqm] = useState('')
  const [isEstimating, setIsEstimating] = useState(false)
  const [result, setResult] = useState<EstimateResult | null>(null)

  async function handleEstimate() {
    if (description.trim().length < 10) return
    setIsEstimating(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          areaSqm: areaSqm ? Number(areaSqm) : undefined,
          language: locale,
        }),
      })
      if (res.status === 429) {
        showErrorToast('Too many requests. Please try again shortly.')
        return
      }
      if (!res.ok) {
        showErrorToast(
          'Could not generate an estimate. Please try rephrasing your project description.'
        )
        return
      }
      setResult((await res.json()) as EstimateResult)
    } finally {
      setIsEstimating(false)
    }
  }

  function addAllToCart() {
    if (!result) return
    let added = 0
    for (const material of result.materials) {
      if (!material.matchedProductId || !material.matchedVariantId || !material.matchedSku) continue
      addItem({
        productId: material.matchedProductId,
        variantId: material.matchedVariantId,
        sku: material.matchedSku,
        nameEn: material.matchedNameEn ?? material.name,
        nameSo: material.matchedNameSo ?? material.name,
        quantity: Math.ceil(material.quantity),
        unitPriceSlsh: material.unit_price_slsh,
        imageUrl: material.matchedImageUrl,
      })
      added++
    }
    if (added === 0) {
      showErrorToast('None of these materials matched a product in our catalog yet.')
    } else {
      showSuccessToast(`Added ${added} item(s) to your cart`)
    }
  }

  function downloadPdf() {
    if (!result) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Borama Hardware — Project Estimate', 14, 16)
    doc.setFontSize(11)
    doc.text(`Project type: ${result.projectType}`, 14, 26)

    autoTable(doc, {
      startY: 32,
      head: [['Material', 'Qty', 'Unit', 'Unit Price', 'Total']],
      body: result.materials.map((m) => [
        m.name,
        String(m.quantity),
        m.unit,
        formatSLSH(m.unit_price_slsh),
        formatSLSH(m.total_slsh),
      ]),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 8
    doc.setFontSize(12)
    doc.text(`Total: ${formatSLSH(result.totalSlsh)}`, 14, finalY)
    doc.setFontSize(9)
    doc.text(result.notes, 14, finalY + 8, { maxWidth: 180 })

    doc.save('borama-hardware-estimate.pdf')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Project Material Estimator"
        subtitle="Describe your project and get an AI-powered materials estimate"
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-orange-600">
            <Hammer className="size-5" />
            <span className="text-sm font-medium">Tell us about your project</span>
          </div>
          <Textarea
            label="Project Description"
            required
            placeholder="e.g. I want to build a 3-room house, 80 square meters"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
          <Input
            label="Area (square meters, optional)"
            type="number"
            value={areaSqm}
            onChange={(e) => setAreaSqm(e.target.value)}
          />
          <Button
            onClick={() => void handleEstimate()}
            loading={isEstimating}
            disabled={description.trim().length < 10}
          >
            Get Estimate
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="animate-content-show mt-6">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">Project Type</p>
                <p className="text-lg font-semibold text-stone-900">{result.projectType}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={downloadPdf}>
                  <Download className="size-4" /> PDF
                </Button>
                <Button onClick={addAllToCart}>
                  <ShoppingCart className="size-4" /> Add All to Cart
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.materials.map((m, i) => (
                  <TableRow key={i} striped={i % 2 === 1}>
                    <TableCell>
                      {m.matchedNameEn ?? m.name}
                      {!m.matchedProductId && (
                        <span className="ml-2 text-xs text-stone-400">
                          (estimated — not in catalog)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.quantity} {m.unit}
                    </TableCell>
                    <TableCell>{formatSLSH(m.unit_price_slsh)}</TableCell>
                    <TableCell>{formatSLSH(m.total_slsh)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <p className="text-2xl font-bold text-stone-900">{formatSLSH(result.totalSlsh)}</p>
                {exchangeRate > 0 && (
                  <p className="text-sm text-stone-500">
                    {slshToUsd(result.totalSlsh, exchangeRate)}
                  </p>
                )}
              </div>
            </div>

            {result.notes && (
              <p className="mt-4 rounded-md bg-stone-50 p-3 text-sm text-stone-600">
                {result.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
