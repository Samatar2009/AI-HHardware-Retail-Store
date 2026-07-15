import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'

import { formatSLSH } from './utils'

export interface ReceiptItem {
  productNameEn: string
  sku: string
  quantity: number
  unitPriceSlsh: number
  totalPriceSlsh: number
}

export interface ReceiptPayment {
  method: string
  amountSlsh: number
  changeSlsh: number
}

export interface ReceiptData {
  transactionNumber: string
  locationName: string
  cashierName: string
  createdAt: string
  items: ReceiptItem[]
  subtotalSlsh: number
  discountAmountSlsh: number
  totalSlsh: number
  payments: ReceiptPayment[]
  loyaltyPointsEarned: number
}

export async function generateReceiptPdf(data: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] })

  doc.setFontSize(12)
  doc.text('Borama Hardware', 40, 8, { align: 'center' })
  doc.setFontSize(8)
  doc.text(data.locationName, 40, 13, { align: 'center' })
  doc.text(`Transaction: ${data.transactionNumber}`, 40, 18, { align: 'center' })
  doc.text(new Date(data.createdAt).toLocaleString(), 40, 22, { align: 'center' })
  doc.text(`Cashier: ${data.cashierName}`, 40, 26, { align: 'center' })

  autoTable(doc, {
    startY: 30,
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1 },
    head: [['Item', 'Qty', 'Total']],
    body: data.items.map((item) => [
      `${item.productNameEn}\n${item.sku}`,
      String(item.quantity),
      formatSLSH(item.totalPriceSlsh),
    ]),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 4

  doc.setFontSize(8)
  doc.text('Subtotal:', 5, y)
  doc.text(formatSLSH(data.subtotalSlsh), 75, y, { align: 'right' })
  y += 4

  if (data.discountAmountSlsh > 0) {
    doc.text('Discount:', 5, y)
    doc.text(`-${formatSLSH(data.discountAmountSlsh)}`, 75, y, { align: 'right' })
    y += 4
  }

  doc.setFontSize(10)
  doc.text('Total:', 5, y)
  doc.text(formatSLSH(data.totalSlsh), 75, y, { align: 'right' })
  y += 6

  doc.setFontSize(8)
  for (const payment of data.payments) {
    doc.text(`${payment.method.toUpperCase()}:`, 5, y)
    doc.text(formatSLSH(payment.amountSlsh), 75, y, { align: 'right' })
    y += 4
    if (payment.changeSlsh > 0) {
      doc.text('Change:', 5, y)
      doc.text(formatSLSH(payment.changeSlsh), 75, y, { align: 'right' })
      y += 4
    }
  }

  if (data.loyaltyPointsEarned > 0) {
    y += 2
    doc.text(`Loyalty points earned: ${data.loyaltyPointsEarned}`, 5, y)
    y += 4
  }

  y += 4
  const qrDataUrl = await QRCode.toDataURL(data.transactionNumber, { margin: 0, width: 128 })
  doc.addImage(qrDataUrl, 'PNG', 30, y, 20, 20)
  y += 24

  doc.setFontSize(7)
  doc.text('Thank you for shopping with us!', 40, y, { align: 'center' })

  return doc
}
