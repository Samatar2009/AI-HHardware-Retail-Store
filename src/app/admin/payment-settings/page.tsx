'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SimpleSelect } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'

interface LocationOption {
  id: string
  name_en: string
}

interface MobileMoneySetting {
  id: string
  location_id: string
  provider: string
  merchant_number: string
  instructions_en: string
  instructions_so: string
  is_active: boolean
}

const PROVIDER_OPTIONS = [
  { value: 'zaad', label: 'Zaad' },
  { value: 'edahab', label: 'eDahab' },
  { value: 'evc_plus', label: 'EVC Plus' },
  { value: 'sahal', label: 'Sahal' },
]

export default function AdminPaymentSettingsPage() {
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [settings, setSettings] = useState<MobileMoneySetting[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [provider, setProvider] = useState('zaad')
  const [merchantNumber, setMerchantNumber] = useState('')
  const [instructionsEn, setInstructionsEn] = useState('')
  const [instructionsSo, setInstructionsSo] = useState('')

  useEffect(() => {
    void fetch('/api/locations')
      .then((res) => res.json())
      .then((data: { locations: LocationOption[] }) => {
        setLocations(data.locations)
        if (data.locations.length > 0) setSelectedLocationId(data.locations[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedLocationId) return
    void loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId])

  async function loadSettings() {
    const res = await fetch(`/api/admin/locations/${selectedLocationId}/mobile-money`)
    if (res.ok) {
      const data = (await res.json()) as { settings: MobileMoneySetting[] }
      setSettings(data.settings)
    }
  }

  async function toggleActive(setting: MobileMoneySetting) {
    setSettings((prev) => prev.map((s) => (s.id === setting.id ? { ...s, is_active: !s.is_active } : s)))
    await fetch(`/api/admin/mobile-money/${setting.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !setting.is_active }),
    })
  }

  async function createSetting() {
    const res = await fetch(`/api/admin/locations/${selectedLocationId}/mobile-money`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, merchantNumber, instructionsEn, instructionsSo }),
    })
    if (!res.ok) {
      showErrorToast('Could not add provider')
      return
    }
    showSuccessToast('Provider added')
    setDialogOpen(false)
    setMerchantNumber('')
    setInstructionsEn('')
    setInstructionsSo('')
    void loadSettings()
  }

  return (
    <div>
      <PageHeader
        title="Payment Settings"
        subtitle="Mobile money providers per location"
        cta={
          <Button onClick={() => setDialogOpen(true)} disabled={!selectedLocationId}>
            <Plus className="size-4" /> Add Provider
          </Button>
        }
      />

      <div className="mb-4 w-64">
        <SimpleSelect
          label="Location"
          value={selectedLocationId}
          onValueChange={setSelectedLocationId}
          options={locations.map((l) => ({ value: l.id, label: l.name_en }))}
        />
      </div>

      <div className="flex flex-col gap-4">
        {settings.map((setting) => (
          <Card key={setting.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base capitalize">{setting.provider.replace('_', ' ')}</CardTitle>
              <Switch checked={setting.is_active} onCheckedChange={() => void toggleActive(setting)} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-700">Merchant number: {setting.merchant_number}</p>
              <p className="text-sm text-stone-500">{setting.instructions_en}</p>
            </CardContent>
          </Card>
        ))}
        {settings.length === 0 && <p className="text-sm text-stone-500">No mobile money providers configured for this location.</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add Mobile Money Provider</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <SimpleSelect label="Provider" value={provider} onValueChange={setProvider} options={PROVIDER_OPTIONS} />
            <Input label="Merchant Number" required value={merchantNumber} onChange={(e) => setMerchantNumber(e.target.value)} />
            <Textarea label="Instructions (English)" required value={instructionsEn} onChange={(e) => setInstructionsEn(e.target.value)} />
            <Textarea label="Instructions (Somali)" required value={instructionsSo} onChange={(e) => setInstructionsSo(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createSetting()} disabled={!merchantNumber || !instructionsEn || !instructionsSo}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
