'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SearchInputProps {
  defaultValue?: string
  placeholder?: string
  onSearch: (value: string) => void
  debounceMs?: number
  className?: string
}

function SearchInput({ defaultValue = '', placeholder, onSearch, debounceMs = 300, className }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => onSearch(value), debounceMs)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs])

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-md border border-stone-300 bg-white py-2 pl-9 text-sm text-stone-900 placeholder:text-stone-400',
          value ? 'pr-9' : 'pr-3',
          'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 focus:border-orange-500'
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
