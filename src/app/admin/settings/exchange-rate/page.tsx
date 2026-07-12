'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface RateRow {
  id: string
  usd_to_slsh_rate: number
  created_at: string
  set_by_profile: { full_name: string | null } | null
}

export default function AdminExchangeRatePage() {
  const [rates, setRates] = useState<RateRow[]>([])
  const [newRate, setNewRate] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    void loadRates()
  }, [])

  async function loadRates() {
    const res = await fetch('/api/admin/exchange-rate')
    if (res.ok) {
      const data = (await res.json()) as { rates: RateRow[] }
      setRates(data.rates)
    }
  }

  async function handleSave() {
    const rate = Number(newRate)
    if (!rate || rate <= 0) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate }),
      })
      if (!res.ok) {
        showErrorToast('Could not update exchange rate')
        return
      }
      showSuccessToast('Exchange rate updated')
      setNewRate('')
      void loadRates()
    } finally {
      setIsSaving(false)
    }
  }

  const current = rates[0]

  return (
    <div>
      <PageHeader title="Exchange Rate" subtitle="Controls the SLSH/USD conversion shown across the storefront" />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-stone-900">1 USD = {current?.usd_to_slsh_rate ?? '—'} SLSH</p>
            <div className="flex items-end gap-3">
              <Input label="New Rate (SLSH per USD)" type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
              <Button onClick={() => void handleSave()} loading={isSaving} disabled={!newRate}>
                Update Rate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate</TableHead>
                  <TableHead>Set By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>{rate.usd_to_slsh_rate}</TableCell>
                    <TableCell>{rate.set_by_profile?.full_name ?? '—'}</TableCell>
                    <TableCell>{formatDate(rate.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
