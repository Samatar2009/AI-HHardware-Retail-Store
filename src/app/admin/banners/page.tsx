'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ImageUpload, type UploadResult } from '@/components/forms/image-upload'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'

interface BannerRow {
  id: string
  title_en: string
  title_so: string
  image_url: string
  cta_text_en: string | null
  cta_url: string | null
  active_from: string
  active_until: string
  sort_order: number
  is_active: boolean
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerRow[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [titleEn, setTitleEn] = useState('')
  const [titleSo, setTitleSo] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [activeFrom, setActiveFrom] = useState('')
  const [activeUntil, setActiveUntil] = useState('')

  useEffect(() => {
    void loadBanners()
  }, [])

  async function loadBanners() {
    const res = await fetch('/api/admin/banners')
    if (res.ok) {
      const data = (await res.json()) as { banners: BannerRow[] }
      setBanners(data.banners)
    }
  }

  async function toggleActive(banner: BannerRow) {
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, is_active: !b.is_active } : b))
    )
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !banner.is_active }),
    })
  }

  async function createBanner() {
    if (!imageUrl) return
    const res = await fetch('/api/admin/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titleEn,
        titleSo,
        imageUrl,
        ctaTextEn: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        activeFrom: new Date(activeFrom).toISOString(),
        activeUntil: new Date(activeUntil).toISOString(),
        sortOrder: banners.length,
      }),
    })
    if (!res.ok) {
      showErrorToast('Could not create banner')
      return
    }
    showSuccessToast('Banner created')
    setDialogOpen(false)
    setTitleEn('')
    setTitleSo('')
    setImageUrl(null)
    setCtaText('')
    setCtaUrl('')
    setActiveFrom('')
    setActiveUntil('')
    void loadBanners()
  }

  return (
    <div>
      <PageHeader
        title="Banners"
        subtitle={`${banners.length} banners`}
        cta={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> New Banner
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.image_url}
              alt=""
              className="aspect-video w-full rounded-t-md object-cover"
            />
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-900">{banner.title_en}</span>
                <Badge variant={banner.is_active ? 'stockInStock' : 'orderCancelled'}>
                  {banner.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500">Sort order {banner.sort_order}</span>
                <Switch
                  checked={banner.is_active}
                  onCheckedChange={() => void toggleActive(banner)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New Banner</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Input
              label="Title (English)"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
            <Input
              label="Title (Somali)"
              required
              value={titleSo}
              onChange={(e) => setTitleSo(e.target.value)}
            />
            <ImageUpload
              label="Banner Image"
              value={imageUrl}
              onUploadedDetailed={(result: UploadResult) => setImageUrl(result.imageUrl)}
              onRemove={() => setImageUrl(null)}
            />
            <Input label="CTA Text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
            <Input label="CTA URL" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Active From"
                type="date"
                required
                value={activeFrom}
                onChange={(e) => setActiveFrom(e.target.value)}
              />
              <Input
                label="Active Until"
                type="date"
                required
                value={activeUntil}
                onChange={(e) => setActiveUntil(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void createBanner()}
              disabled={!titleEn || !titleSo || !imageUrl || !activeFrom || !activeUntil}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
