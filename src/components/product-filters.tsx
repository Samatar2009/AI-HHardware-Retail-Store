'use client'

import { useLocale } from 'next-intl'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { formatSLSH } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface CategoryNode {
  id: string
  name_en: string
  name_so: string
  children: CategoryNode[]
}

export interface ProductFiltersState {
  categoryId: string | null
  minPrice: number | null
  maxPrice: number | null
  inStockOnly: boolean
  brands: string[]
}

interface ProductFiltersProps {
  categories: CategoryNode[]
  availableBrands: string[]
  priceBounds: { min: number; max: number }
  filters: ProductFiltersState
  onChange: (filters: ProductFiltersState) => void
  onClear: () => void
}

function CategoryTreeItem({
  node,
  selectedId,
  onSelect,
}: {
  node: CategoryNode
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const locale = useLocale()
  const name = locale === 'so' ? node.name_so : node.name_en

  return (
    <div>
      <div className="flex items-center gap-1">
        {node.children.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label="Toggle subcategories"
          >
            {expanded ? (
              <ChevronDown className="size-3.5 text-stone-400" />
            ) : (
              <ChevronRight className="size-3.5 text-stone-400" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 text-left text-sm',
            selectedId === node.id
              ? 'bg-orange-50 font-medium text-orange-700'
              : 'text-stone-700 hover:bg-stone-100'
          )}
        >
          {name}
        </button>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="ml-4 flex flex-col gap-0.5">
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductFilters({
  categories,
  availableBrands,
  priceBounds,
  filters,
  onChange,
  onClear,
}: ProductFiltersProps) {
  const lowerBound = priceBounds.min
  const upperBound = priceBounds.max > priceBounds.min ? priceBounds.max : priceBounds.min + 1
  const sliderValue = [filters.minPrice ?? lowerBound, filters.maxPrice ?? upperBound]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-900">Category</h3>
        <div className="flex flex-col gap-0.5">
          {categories.map((cat) => (
            <CategoryTreeItem
              key={cat.id}
              node={cat}
              selectedId={filters.categoryId}
              onSelect={(id) =>
                onChange({ ...filters, categoryId: filters.categoryId === id ? null : id })
              }
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-900">Price Range</h3>
        <Slider
          min={lowerBound}
          max={upperBound}
          step={1000}
          value={sliderValue}
          onValueChange={([min, max]) => onChange({ ...filters, minPrice: min, maxPrice: max })}
        />
        <div className="mt-2 flex justify-between text-xs text-stone-500">
          <span>{formatSLSH(sliderValue[0])}</span>
          <span>{formatSLSH(sliderValue[1])}</span>
        </div>
      </div>

      <div>
        <Switch
          label="In stock only"
          checked={filters.inStockOnly}
          onCheckedChange={(checked) => onChange({ ...filters, inStockOnly: checked })}
        />
      </div>

      {availableBrands.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-900">Brand</h3>
          <div className="flex flex-col gap-2">
            {availableBrands.map((brand) => (
              <Checkbox
                key={brand}
                label={brand}
                checked={filters.brands.includes(brand)}
                onCheckedChange={(checked) =>
                  onChange({
                    ...filters,
                    brands: checked
                      ? [...filters.brands, brand]
                      : filters.brands.filter((b) => b !== brand),
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      <Button variant="secondary" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  )
}

export { ProductFilters }
