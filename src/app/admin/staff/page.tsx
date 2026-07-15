'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SimpleSelect } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/types/auth'

interface StaffRow {
  user_id: string
  phone: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  location: { name_en: string } | null
  location_id: string | null
}

interface LocationOption {
  id: string
  name_en: string
}

const ROLE_BADGE: Record<string, NonNullable<BadgeProps['variant']>> = {
  admin: 'roleAdmin',
  cashier: 'roleCashier',
  inventory_manager: 'roleInventoryManager',
}

const ROLE_OPTIONS = [
  { value: 'cashier', label: 'Cashier' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'admin', label: 'Admin' },
]

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('cashier')
  const [locationId, setLocationId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    void loadStaff()
    void fetch('/api/locations')
      .then((res) => res.json())
      .then((data: { locations: LocationOption[] }) => setLocations(data.locations))
  }, [])

  async function loadStaff() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/staff')
      if (res.ok) {
        const data = (await res.json()) as { staff: StaffRow[] }
        setStaff(data.staff)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleActive(row: StaffRow) {
    setStaff((prev) =>
      prev.map((s) => (s.user_id === row.user_id ? { ...s, is_active: !s.is_active } : s))
    )
    await fetch(`/api/admin/staff/${row.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !row.is_active }),
    })
  }

  async function updateRole(row: StaffRow, newRole: string) {
    setStaff((prev) =>
      prev.map((s) => (s.user_id === row.user_id ? { ...s, role: newRole as UserRole } : s))
    )
    await fetch(`/api/admin/staff/${row.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
  }

  async function handleAddStaff() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role, locationId: locationId || null }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not assign staff role')
        return
      }
      showSuccessToast('Staff role assigned')
      setAddDialogOpen(false)
      setPhone('')
      setRole('cashier')
      setLocationId('')
      void loadStaff()
    } finally {
      setIsSaving(false)
    }
  }

  const locationOptions = useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name_en })),
    [locations]
  )

  const columns: DataTableColumn<StaffRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {getInitials(row.full_name || row.phone)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-stone-900">{row.full_name || '—'}</span>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={ROLE_BADGE[row.role]}>{row.role.replace('_', ' ')}</Badge>
          <SimpleSelect
            value={row.role}
            onValueChange={(v) => void updateRole(row, v)}
            options={ROLE_OPTIONS}
          />
        </div>
      ),
    },
    { key: 'location', header: 'Location', render: (row) => row.location?.name_en ?? '—' },
    {
      key: 'active',
      header: 'Active',
      render: (row) => (
        <Switch checked={row.is_active} onCheckedChange={() => void toggleActive(row)} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} staff members`}
        cta={
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4" /> Add Staff
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={staff}
        getRowId={(row) => row.user_id}
        isLoading={isLoading}
        emptyTitle="No staff yet"
      />

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Input
              label="Phone Number"
              required
              placeholder="+252..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="The user must have already signed in at least once. Admin never creates accounts directly."
            />
            <SimpleSelect
              label="Role"
              value={role}
              onValueChange={setRole}
              options={ROLE_OPTIONS}
            />
            <SimpleSelect
              label="Location"
              value={locationId}
              onValueChange={setLocationId}
              options={locationOptions}
              placeholder="Select a location"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddStaff()} disabled={!phone} loading={isSaving}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
