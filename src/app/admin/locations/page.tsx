'use client'

import { useEffect, useState } from 'react'
import { Plus, Clock } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'

interface HourRow {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
  has_prayer_break: boolean
  prayer_start: string | null
  prayer_end: string | null
}

interface LocationRow {
  id: string
  name_en: string
  name_so: string
  address: string
  phone: string | null
  is_active: boolean
  location_hours: HourRow[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function defaultHours(): HourRow[] {
  return DAYS.map((_, i) => ({
    day_of_week: i,
    open_time: '08:00',
    close_time: '18:00',
    is_closed: false,
    has_prayer_break: true,
    prayer_start: '12:00',
    prayer_end: '13:00',
  }))
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [nameEn, setNameEn] = useState('')
  const [nameSo, setNameSo] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  const [hoursDialogOpen, setHoursDialogOpen] = useState(false)
  const [hoursLocationId, setHoursLocationId] = useState<string | null>(null)
  const [hours, setHours] = useState<HourRow[]>(defaultHours())

  useEffect(() => {
    void loadLocations()
  }, [])

  async function loadLocations() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/locations')
      if (res.ok) {
        const data = (await res.json()) as { locations: LocationRow[] }
        setLocations(data.locations)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleActive(loc: LocationRow) {
    setLocations((prev) => prev.map((l) => (l.id === loc.id ? { ...l, is_active: !l.is_active } : l)))
    await fetch(`/api/admin/locations/${loc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !loc.is_active }),
    })
  }

  async function createLocation() {
    const res = await fetch('/api/admin/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nameEn, nameSo, address, phone: phone || undefined }),
    })
    if (!res.ok) {
      showErrorToast('Could not create location')
      return
    }
    showSuccessToast('Location created')
    setNewDialogOpen(false)
    setNameEn('')
    setNameSo('')
    setAddress('')
    setPhone('')
    void loadLocations()
  }

  function openHours(loc: LocationRow) {
    setHoursLocationId(loc.id)
    setHours(loc.location_hours.length === 7 ? [...loc.location_hours].sort((a, b) => a.day_of_week - b.day_of_week) : defaultHours())
    setHoursDialogOpen(true)
  }

  function updateHour(index: number, field: keyof HourRow, value: string | boolean) {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)))
  }

  async function saveHours() {
    if (!hoursLocationId) return
    const res = await fetch(`/api/admin/locations/${hoursLocationId}/hours`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hours: hours.map((h) => ({
          dayOfWeek: h.day_of_week,
          openTime: h.open_time,
          closeTime: h.close_time,
          isClosed: h.is_closed,
          hasPrayerBreak: h.has_prayer_break,
          prayerStart: h.prayer_start,
          prayerEnd: h.prayer_end,
        })),
      }),
    })
    if (!res.ok) {
      showErrorToast('Could not save hours')
      return
    }
    showSuccessToast('Hours saved')
    setHoursDialogOpen(false)
    void loadLocations()
  }

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle={`${locations.length} branches`}
        cta={
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="size-4" /> New Location
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{loc.name_en}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={loc.is_active ? 'stockInStock' : 'orderCancelled'}>{loc.is_active ? 'Active' : 'Inactive'}</Badge>
                  <Switch checked={loc.is_active} onCheckedChange={() => void toggleActive(loc)} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-500">{loc.address}</p>
                <p className="text-sm text-stone-500">{loc.phone ?? 'No phone set'}</p>
                <Button variant="secondary" size="sm" onClick={() => openHours(loc)}>
                  <Clock className="size-3.5" /> Edit Hours
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New Location</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Input label="Name (English)" required value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            <Input label="Name (Somali)" required value={nameSo} onChange={(e) => setNameSo(e.target.value)} />
            <Input label="Address" required value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createLocation()} disabled={!nameEn || !nameSo || !address}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Location Hours</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3">
            {hours.map((h, i) => (
              <div key={h.day_of_week} className="grid grid-cols-6 items-center gap-3 border-b border-stone-100 pb-3">
                <span className="text-sm font-medium">{DAYS[h.day_of_week]}</span>
                <Switch label="Closed" checked={h.is_closed} onCheckedChange={(v) => updateHour(i, 'is_closed', v)} />
                <Input type="time" value={h.open_time} onChange={(e) => updateHour(i, 'open_time', e.target.value)} disabled={h.is_closed} />
                <Input type="time" value={h.close_time} onChange={(e) => updateHour(i, 'close_time', e.target.value)} disabled={h.is_closed} />
                <Switch label="Prayer break" checked={h.has_prayer_break} onCheckedChange={(v) => updateHour(i, 'has_prayer_break', v)} />
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={h.prayer_start ?? ''}
                    onChange={(e) => updateHour(i, 'prayer_start', e.target.value)}
                    disabled={!h.has_prayer_break}
                  />
                  <Input
                    type="time"
                    value={h.prayer_end ?? ''}
                    onChange={(e) => updateHour(i, 'prayer_end', e.target.value)}
                    disabled={!h.has_prayer_break}
                  />
                </div>
              </div>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setHoursDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveHours()}>Save Hours</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
