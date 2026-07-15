'use client'

import { Plus, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface AttributePair {
  key: string
  value: string
}

interface AttributeEditorProps {
  label?: string
  pairs: AttributePair[]
  onChange: (pairs: AttributePair[]) => void
}

function AttributeEditor({ label = 'Attributes', pairs, onChange }: AttributeEditorProps) {
  function updatePair(index: number, field: keyof AttributePair, value: string) {
    onChange(pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function removePair(index: number) {
    onChange(pairs.filter((_, i) => i !== index))
  }

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      <div className="flex flex-col gap-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="e.g. size"
              value={pair.key}
              onChange={(e) => updatePair(i, 'key', e.target.value)}
            />
            <Input
              placeholder="e.g. 10mm"
              value={pair.value}
              onChange={(e) => updatePair(i, 'value', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removePair(i)}
              aria-label="Remove attribute"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...pairs, { key: '', value: '' }])}
        >
          <Plus className="size-3.5" /> Add attribute
        </Button>
      </div>
    </div>
  )
}

export function attributesToObject(pairs: AttributePair[]): Record<string, string> {
  return Object.fromEntries(
    pairs.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value.trim()])
  )
}

export function objectToAttributes(
  obj: Record<string, string> | null | undefined
): AttributePair[] {
  return Object.entries(obj ?? {}).map(([key, value]) => ({ key, value }))
}

export { AttributeEditor }
