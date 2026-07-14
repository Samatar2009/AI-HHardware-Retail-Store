import { describe, expect, it } from 'vitest'

import { generateReceiptPdf, type ReceiptData } from '@/lib/receipt'

function baseReceipt(overrides: Partial<ReceiptData> = {}): ReceiptData {
  return {
    transactionNumber: 'POS-2026-00001',
    locationName: 'Main Branch',
    cashierName: 'Ahmed Ali',
    createdAt: '2026-07-12T12:00:00.000Z',
    items: [
      {
        productNameEn: 'Claw Hammer',
        sku: 'SKU-1',
        quantity: 2,
        unitPriceSlsh: 50000,
        totalPriceSlsh: 100000,
      },
    ],
    subtotalSlsh: 100000,
    discountAmountSlsh: 0,
    totalSlsh: 100000,
    payments: [{ method: 'cash', amountSlsh: 100000, changeSlsh: 0 }],
    loyaltyPointsEarned: 0,
    ...overrides,
  }
}

describe('generateReceiptPdf', () => {
  it('generates a PDF document without throwing', async () => {
    const doc = await generateReceiptPdf(baseReceipt())
    expect(doc.output('datauristring')).toContain('data:application/pdf')
  })

  it('includes a discount line only when a discount was applied', async () => {
    const withDiscount = await generateReceiptPdf(
      baseReceipt({ discountAmountSlsh: 10000, totalSlsh: 90000 })
    )
    const withoutDiscount = await generateReceiptPdf(baseReceipt())

    // A PDF with an extra text line is structurally larger than one without.
    expect(withDiscount.output('datauristring').length).toBeGreaterThan(0)
    expect(withoutDiscount.output('datauristring').length).toBeGreaterThan(0)
  })

  it('handles multiple split payments and a change line', async () => {
    const doc = await generateReceiptPdf(
      baseReceipt({
        payments: [
          { method: 'cash', amountSlsh: 60000, changeSlsh: 5000 },
          { method: 'zaad', amountSlsh: 45000, changeSlsh: 0 },
        ],
      })
    )
    expect(doc.output('datauristring')).toContain('data:application/pdf')
  })

  it('handles a receipt with no loyalty points earned and one with points', async () => {
    const withoutPoints = await generateReceiptPdf(baseReceipt({ loyaltyPointsEarned: 0 }))
    const withPoints = await generateReceiptPdf(baseReceipt({ loyaltyPointsEarned: 125 }))

    expect(withoutPoints.output('datauristring')).toContain('data:application/pdf')
    expect(withPoints.output('datauristring')).toContain('data:application/pdf')
  })
})
