'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SimpleSelect } from '@/components/ui/select'
import { ImageUpload } from '@/components/forms/image-upload'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { showSuccessToast, showErrorToast } from '@/components/ui/toast'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface CategoryRow {
  id: string
  name_en: string
  name_so: string
  parent_id: string | null
  icon_url: string | null
  sort_order: number
  is_active: boolean
}

interface CategoryNode extends CategoryRow {
  children: CategoryNode[]
}

function buildTree(flat: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>(flat.map((c) => [c.id, { ...c, children: [] }]))
  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function CategoryTreeRow({
  node,
  depth,
  onEdit,
  onToggleActive,
}: {
  node: CategoryNode
  depth: number
  onEdit: (node: CategoryNode) => void
  onToggleActive: (node: CategoryNode) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <>
      <div
        className={cn('flex items-center gap-2 border-b border-stone-100 py-2', !node.is_active && 'opacity-50')}
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        {hasChildren ? (
          <button type="button" onClick={() => setExpanded((e) => !e)} className="text-stone-400 hover:text-stone-600">
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {node.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.icon_url} alt="" className="size-6 rounded object-cover" />
        ) : (
          <div className="size-6 rounded bg-stone-100" />
        )}
        <span className="flex-1 text-sm font-medium text-stone-900">{node.name_en}</span>
        <span className="text-xs text-stone-500">{node.name_so}</span>
        <Badge variant={node.is_active ? 'stockInStock' : 'orderCancelled'}>{node.is_active ? 'Active' : 'Inactive'}</Badge>
        <Switch checked={node.is_active} onCheckedChange={() => onToggleActive(node)} />
        <Button variant="ghost" size="sm" onClick={() => onEdit(node)}>
          <Pencil className="size-3.5" />
        </Button>
      </div>
      {expanded &&
        node.children
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((child) => <CategoryTreeRow key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onToggleActive={onToggleActive} />)}
    </>
  )
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryNode | null>(null)

  const [nameEn, setNameEn] = useState('')
  const [nameSo, setNameSo] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [sortOrder, setSortOrder] = useState('0')
  const [iconUrl, setIconUrl] = useState<string | null>(null)

  useEffect(() => {
    void loadCategories()
  }, [])

  async function loadCategories() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/categories')
      if (res.ok) {
        const data = (await res.json()) as { categories: CategoryRow[] }
        setCategories(data.categories)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const tree = useMemo(() => buildTree(categories).sort((a, b) => a.sort_order - b.sort_order), [categories])

  const parentOptions = useMemo(
    () => [
      { value: 'none', label: 'No parent (top-level)' },
      ...categories.filter((c) => c.id !== editing?.id).map((c) => ({ value: c.id, label: c.name_en })),
    ],
    [categories, editing]
  )

  function openNew() {
    setEditing(null)
    setNameEn('')
    setNameSo('')
    setParentId('none')
    setSortOrder('0')
    setIconUrl(null)
    setDialogOpen(true)
  }

  function openEdit(node: CategoryNode) {
    setEditing(node)
    setNameEn(node.name_en)
    setNameSo(node.name_so)
    setParentId(node.parent_id ?? 'none')
    setSortOrder(String(node.sort_order))
    setIconUrl(node.icon_url)
    setDialogOpen(true)
  }

  async function save() {
    const payload = {
      nameEn,
      nameSo,
      parentId: parentId === 'none' ? null : parentId,
      iconUrl,
      sortOrder: Number(sortOrder) || 0,
    }

    const res = editing
      ? await fetch(`/api/admin/categories/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      showErrorToast(data.error ?? 'Could not save category')
      return
    }

    showSuccessToast('Category saved')
    setDialogOpen(false)
    void loadCategories()
  }

  async function toggleActive(node: CategoryNode) {
    await fetch(`/api/admin/categories/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !node.is_active }),
    })
    void loadCategories()
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} total categories`}
        cta={
          <Button onClick={openNew}>
            <Plus className="size-4" /> New Category
          </Button>
        }
      />

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : tree.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">No categories yet.</p>
          ) : (
            tree.map((node) => <CategoryTreeRow key={node.id} node={node} depth={0} onEdit={openEdit} onToggleActive={(n) => void toggleActive(n)} />)
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Input label="Name (English)" required value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            <Input label="Name (Somali)" required value={nameSo} onChange={(e) => setNameSo(e.target.value)} />
            <SimpleSelect label="Parent Category" value={parentId} onValueChange={setParentId} options={parentOptions} />
            <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            <ImageUpload
              label="Icon"
              value={iconUrl}
              uploadUrl="/api/admin/categories/upload-icon"
              onUploaded={setIconUrl}
              onRemove={() => setIconUrl(null)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={!nameEn || !nameSo}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
