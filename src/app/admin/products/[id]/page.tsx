'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Sparkles, Plus, Pencil, X } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SimpleSelect } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { PriceInput } from '@/components/forms/price-input'
import { ImageUpload, type UploadResult } from '@/components/forms/image-upload'
import {
  AttributeEditor,
  attributesToObject,
  objectToAttributes,
  type AttributePair,
} from '@/components/forms/attribute-editor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { Spinner } from '@/components/ui/spinner'
import { formatSLSH } from '@/lib/utils'

interface CategoryOption {
  id: string
  name_en: string
  children: CategoryOption[]
}

interface VariantRow {
  id: string
  sku: string
  price_slsh: number
  cost_price_slsh: number
  attributes: Record<string, string>
  is_active: boolean
}

interface ImageRow {
  id: string
  image_url: string
  thumbnail_url: string
  sort_order: number
}

interface ProductDetail {
  id: string
  name_en: string
  name_so: string
  description_en: string | null
  description_so: string | null
  category_id: string
  brand: string | null
  unit: string
  is_featured: boolean
  is_active: boolean
  product_variants: VariantRow[]
  product_images: ImageRow[]
  category: { name_en: string } | null
}

function flattenCategories(nodes: CategoryOption[], depth = 0): { value: string; label: string }[] {
  return nodes.flatMap((node) => [
    { value: node.id, label: `${'— '.repeat(depth)}${node.name_en}` },
    ...flattenCategories(node.children, depth + 1),
  ])
}

export default function AdminProductsIdPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<VariantRow | null>(null)
  const [variantSku, setVariantSku] = useState('')
  const [variantPrice, setVariantPrice] = useState<number | undefined>(undefined)
  const [variantCost, setVariantCost] = useState<number | undefined>(undefined)
  const [variantAttributes, setVariantAttributes] = useState<AttributePair[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    void loadProduct()
    void fetch('/api/categories')
      .then((res) => res.json())
      .then((data: { categories: CategoryOption[] }) =>
        setCategories(flattenCategories(data.categories))
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function loadProduct() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`)
      if (res.ok) {
        const data = (await res.json()) as { product: ProductDetail }
        setProduct(data.product)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function updateField(field: string, value: unknown) {
    if (!product) return
    await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  function openNewVariant() {
    setEditingVariant(null)
    setVariantSku('')
    setVariantPrice(undefined)
    setVariantCost(undefined)
    setVariantAttributes([])
    setVariantDialogOpen(true)
  }

  function openEditVariant(variant: VariantRow) {
    setEditingVariant(variant)
    setVariantSku(variant.sku)
    setVariantPrice(variant.price_slsh)
    setVariantCost(variant.cost_price_slsh)
    setVariantAttributes(objectToAttributes(variant.attributes))
    setVariantDialogOpen(true)
  }

  async function saveVariant() {
    if (variantPrice === undefined || variantCost === undefined) return
    const attributes = attributesToObject(variantAttributes)

    if (editingVariant) {
      await fetch(`/api/admin/variants/${editingVariant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: variantSku,
          priceSlsh: variantPrice,
          costPriceSlsh: variantCost,
          attributes,
        }),
      })
    } else {
      await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: variantSku,
          priceSlsh: variantPrice,
          costPriceSlsh: variantCost,
          attributes,
        }),
      })
    }

    setVariantDialogOpen(false)
    showSuccessToast('Variant saved')
    void loadProduct()
  }

  async function toggleVariantActive(variant: VariantRow) {
    await fetch(`/api/admin/variants/${variant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !variant.is_active }),
    })
    void loadProduct()
  }

  async function handleImageUploaded(result: UploadResult) {
    if (!product) return
    await fetch(`/api/admin/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        sortOrder: product.product_images.length,
      }),
    })
    void loadProduct()
  }

  async function removeImage(imageId: string) {
    await fetch(`/api/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' })
    void loadProduct()
  }

  async function reorderImages(from: number, to: number) {
    if (!product) return
    const reordered = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setProduct({
      ...product,
      product_images: reordered.map((img, i) => ({ ...img, sort_order: i })),
    })

    await fetch(`/api/admin/products/${productId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: reordered.map((img, i) => ({ id: img.id, sortOrder: i })) }),
    })
  }

  async function regenerateDescription() {
    if (!product) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: product.name_en,
          nameSo: product.name_so,
          category: product.category?.name_en ?? '',
          brand: product.brand ?? undefined,
        }),
      })
      if (!res.ok) {
        showErrorToast('Could not generate description')
        return
      }
      const data = (await res.json()) as { description_en: string; description_so: string }
      setProduct({
        ...product,
        description_en: data.description_en,
        description_so: data.description_so,
      })
      await updateField('descriptionEn', data.description_en)
      await updateField('descriptionSo', data.description_so)
      showSuccessToast('Description generated')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading || !product) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const sortedImages = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.name_en}
        subtitle={`Base SKU category: ${product.category?.name_en ?? '—'}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name (English)"
              defaultValue={product.name_en}
              onBlur={(e) => updateField('nameEn', e.target.value)}
            />
            <Input
              label="Name (Somali)"
              defaultValue={product.name_so}
              onBlur={(e) => updateField('nameSo', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">Description</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void regenerateDescription()}
              loading={isGenerating}
            >
              <Sparkles className="size-3.5" /> Regenerate with AI
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Textarea
              label="Description (English)"
              defaultValue={product.description_en ?? ''}
              value={product.description_en ?? ''}
              onChange={(e) => setProduct({ ...product, description_en: e.target.value })}
              onBlur={(e) => updateField('descriptionEn', e.target.value)}
            />
            <Textarea
              label="Description (Somali)"
              defaultValue={product.description_so ?? ''}
              value={product.description_so ?? ''}
              onChange={(e) => setProduct({ ...product, description_so: e.target.value })}
              onBlur={(e) => updateField('descriptionSo', e.target.value)}
            />
          </div>

          <SimpleSelect
            label="Category"
            value={product.category_id}
            onValueChange={(v) => {
              setProduct({ ...product, category_id: v })
              void updateField('categoryId', v)
            }}
            options={categories}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Brand"
              defaultValue={product.brand ?? ''}
              onBlur={(e) => updateField('brand', e.target.value)}
            />
            <Input
              label="Unit"
              defaultValue={product.unit}
              onBlur={(e) => updateField('unit', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-6">
            <Switch
              label="Featured"
              checked={product.is_featured}
              onCheckedChange={(v) => {
                setProduct({ ...product, is_featured: v })
                void updateField('isFeatured', v)
              }}
            />
            <Switch
              label="Active"
              checked={product.is_active}
              onCheckedChange={(v) => {
                setProduct({ ...product, is_active: v })
                void updateField('isActive', v)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Variants</CardTitle>
          <Button size="sm" onClick={openNewVariant}>
            <Plus className="size-3.5" /> Add Variant
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-[0.05em] text-stone-500">
                <th className="py-2">SKU</th>
                <th className="py-2">Price</th>
                <th className="py-2">Cost</th>
                <th className="py-2">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {product.product_variants.map((variant) => (
                <tr key={variant.id}>
                  <td className="py-2">{variant.sku}</td>
                  <td className="py-2">{formatSLSH(variant.price_slsh)}</td>
                  <td className="py-2">{formatSLSH(variant.cost_price_slsh)}</td>
                  <td className="py-2">
                    <Badge variant={variant.is_active ? 'stockInStock' : 'orderCancelled'}>
                      {variant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="flex items-center gap-2 py-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditVariant(variant)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void toggleVariantActive(variant)}
                    >
                      {variant.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {sortedImages.map((img, i) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== i) void reorderImages(dragIndex, i)
                  setDragIndex(null)
                }}
                className="relative aspect-square w-[140px] cursor-grab overflow-hidden rounded-lg border border-stone-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumbnail_url} alt="" className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Primary
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void removeImage(img.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <ImageUpload onUploadedDetailed={(result) => void handleImageUploaded(result)} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Input
              label="SKU"
              required
              value={variantSku}
              onChange={(e) => setVariantSku(e.target.value)}
            />
            <PriceInput
              label="Price (SLSH)"
              required
              value={variantPrice}
              onChange={setVariantPrice}
            />
            <PriceInput
              label="Cost Price (SLSH)"
              required
              value={variantCost}
              onChange={setVariantCost}
            />
            <AttributeEditor pairs={variantAttributes} onChange={setVariantAttributes} />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setVariantDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveVariant()}
              disabled={!variantSku || variantPrice === undefined || variantCost === undefined}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
