'use client'

import { useEffect, useMemo, useState } from 'react'
import { DollarSign, Package, TrendingUp, Award } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { KpiCard } from '@/components/admin/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SimpleSelect } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatSLSH } from '@/lib/utils'

interface LocationOption {
  id: string
  name_en: string
}

interface AnalyticsData {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  topProduct: string | null
  topProducts: { name: string; quantity: number; revenue: number }[]
  revenueByLocation: { name: string; revenue: number; orders: number }[]
  revenueByPaymentMethod: { method: string; revenue: number; orders: number }[]
}

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

function rangeToDates(range: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  if (range === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { from: start.toISOString(), to }
  }
  const days = range === '30d' ? 30 : 7
  const start = new Date(now.getTime() - days * 86400000)
  return { from: start.toISOString(), to }
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState('7d')
  const [locationId, setLocationId] = useState('all')
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/locations')
      .then((res) => res.json())
      .then((d: { locations: LocationOption[] }) => setLocations(d.locations))
  }, [])

  useEffect(() => {
    void loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, locationId])

  async function loadAnalytics() {
    setIsLoading(true)
    try {
      const { from, to } = rangeToDates(range)
      const params = new URLSearchParams({ from, to })
      if (locationId !== 'all') params.set('location_id', locationId)

      const res = await fetch(`/api/admin/analytics?${params.toString()}`)
      if (res.ok) {
        setData((await res.json()) as AnalyticsData)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const locationOptions = useMemo(
    () => [{ value: 'all', label: 'All locations' }, ...locations.map((l) => ({ value: l.id, label: l.name_en }))],
    [locations]
  )

  return (
    <div>
      <PageHeader title="Analytics" />

      <div className="mb-6 flex gap-4">
        <div className="w-48">
          <SimpleSelect value={range} onValueChange={setRange} options={RANGE_OPTIONS} />
        </div>
        <div className="w-56">
          <SimpleSelect value={locationId} onValueChange={setLocationId} options={locationOptions} />
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-stone-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={DollarSign} label="Total Revenue" value={formatSLSH(data.totalRevenue)} />
            <KpiCard icon={Package} label="Orders" value={String(data.orderCount)} />
            <KpiCard icon={TrendingUp} label="Average Order Value" value={formatSLSH(data.averageOrderValue)} />
            <KpiCard icon={Award} label="Top Product" value={data.topProduct ?? '—'} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Products by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell>{formatSLSH(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.revenueByLocation.map((l) => (
                        <TableRow key={l.name}>
                          <TableCell>{l.name}</TableCell>
                          <TableCell>{l.orders}</TableCell>
                          <TableCell>{formatSLSH(l.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.revenueByPaymentMethod.map((p) => (
                        <TableRow key={p.method}>
                          <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                          <TableCell>{p.orders}</TableCell>
                          <TableCell>{formatSLSH(p.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
