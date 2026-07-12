'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SimpleSelect } from '@/components/ui/select'
import { PriceInput } from '@/components/forms/price-input'
import { ImageUpload, type UploadResult } from '@/components/forms/image-upload'
import { AttributeEditor, attributesToObject, type AttributePair } from '@/components/forms/attribute-editor'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'

interface CategoryOption {
  id: string
  name_en: string
  children: CategoryOption[]
}

interface UploadedImage extends UploadResult {
  tempId: string
}

const STEPS = ['Basic Info', 'First Variant', 'Images', 'Review'] as const

function flattenCategories(nodes: CategoryOption[], depth = 0): { value: string; label: string }[] {
  return nodes.flatMap((node) => [
    { value: node.id, label: `${'— '.repeat(depth)}${node.name_en}` },
    ...flattenCategories(node.children, depth + 1),
  ])
}

export default function AdminProductsNewPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])

  const [nameEn, setNameEn] = useState('')
  const [nameSo, setNameSo] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionSo, setDescriptionSo] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [unit, setUnit] = useState('each')
  const [skuBase, setSkuBase] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const [variantSku, setVariantSku] = useState('')
  const [priceSlsh, setPriceSlsh] = useState<number | undefined>(undefined)
  const [costPriceSlsh, setCostPriceSlsh] = useState<number | undefined>(undefined)
  const [variantAttributes, setVariantAttributes] = useState<AttributePair[]>([])

  const [images, setImages] = useState<UploadedImage[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    void fetch('/api/categories')
      .then((res) => res.json())
      .then((data: { categories: CategoryOption[] }) => setCategories(flattenCategories(data.categories)))
  }, [])

  function canAdvance(): boolean {
    if (step === 0) return !!nameEn && !!nameSo && !!categoryId && !!skuBase
    if (step === 1) return !!variantSku && priceSlsh !== undefined && costPriceSlsh !== undefined
    return true
  }

  function reorderImages(from: number, to: number) {
    setImages((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      return copy
    })
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn,
          nameSo,
          descriptionEn: descriptionEn || undefined,
          descriptionSo: descriptionSo || undefined,
          categoryId,
          brand: brand || undefined,
          unit,
          skuBase,
          tags: tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          variant: {
            sku: variantSku,
            priceSlsh,
            costPriceSlsh,
            attributes: attributesToObject(variantAttributes),
          },
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showErrorToast(data.error ?? 'Could not create product')
        return
      }

      const { product } = (await res.json()) as { product: { id: string } }

      for (let i = 0; i < images.length; i++) {
        await fetch(`/api/admin/products/${product.id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: images[i].imageUrl,
            thumbnailUrl: images[i].thumbnailUrl,
            sortOrder: i,
          }),
        })
      }

      await fetch('/api/ai/embed-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => undefined)

      showSuccessToast('Product created')
      router.push(`/admin/products/${product.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="New Product" subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} />

      <div className="mb-6 flex gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-orange-500' : 'bg-stone-200'}`} />
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Name (English)" required value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
                <Input label="Name (Somali)" required value={nameSo} onChange={(e) => setNameSo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Textarea label="Description (English)" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
                <Textarea label="Description (Somali)" value={descriptionSo} onChange={(e) => setDescriptionSo(e.target.value)} />
              </div>
              <SimpleSelect
                label="Category"
                value={categoryId}
                onValueChange={setCategoryId}
                options={categories}
                placeholder="Select a category"
              />
              <div className="grid grid-cols-3 gap-4">
                <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} helperText="e.g. each, bag, meter" />
                <Input label="Base SKU" required value={skuBase} onChange={(e) => setSkuBase(e.target.value)} />
              </div>
              <Input label="Tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} helperText="Comma-separated" />
            </>
          )}

          {step === 1 && (
            <>
              <Input label="Variant SKU" required value={variantSku} onChange={(e) => setVariantSku(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <PriceInput label="Price (SLSH)" required value={priceSlsh} onChange={setPriceSlsh} />
                <PriceInput label="Cost Price (SLSH)" required value={costPriceSlsh} onChange={setCostPriceSlsh} />
              </div>
              <AttributeEditor pairs={variantAttributes} onChange={setVariantAttributes} />
            </>
          )}

          {step === 2 && (
            <div>
              <p className="mb-3 text-sm text-stone-500">Upload product images. Drag to reorder — the first image is the primary image.</p>
              <div className="flex flex-wrap gap-4">
                {images.map((img, i) => (
                  <div
                    key={img.tempId}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null && dragIndex !== i) reorderImages(dragIndex, i)
                      setDragIndex(null)
                    }}
                    className="relative aspect-square w-[140px] cursor-grab overflow-hidden rounded-lg border border-stone-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumbnailUrl} alt="" className="size-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <ImageUpload
                  onUploadedDetailed={(result) => setImages((prev) => [...prev, { ...result, tempId: crypto.randomUUID() }])}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3 text-sm">
              <p><strong>{nameEn}</strong> ({nameSo})</p>
              <p className="text-stone-500">{descriptionEn || 'No description'}</p>
              <p>Category: {categories.find((c) => c.value === categoryId)?.label ?? '—'}</p>
              <p>Brand: {brand || '—'} · Unit: {unit} · SKU: {skuBase}</p>
              <p>First variant: {variantSku} — {priceSlsh} SLSH (cost {costPriceSlsh} SLSH)</p>
              <p>{images.length} image(s) attached</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
            Next
          </Button>
        ) : (
          <Button onClick={() => void handleSubmit()} loading={isSubmitting}>
            Create Product
          </Button>
        )}
      </div>
    </div>
  )
}
