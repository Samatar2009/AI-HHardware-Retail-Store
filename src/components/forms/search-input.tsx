'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SearchInputProps {
  value?: string
  defaultValue?: string
  placeholder?: string
  onSearch: (value: string) => void
  onSubmit?: (value: string) => void
  debounceMs?: number
  className?: string
  autoFocus?: boolean
  size?: 'md' | 'lg'
}

function SearchInput({
  value: controlledValue,
  defaultValue = '',
  placeholder,
  onSearch,
  onSubmit,
  debounceMs = 300,
  className,
  autoFocus,
  size = 'md',
}: SearchInputProps) {
  const [value, setValue] = useState(controlledValue ?? defaultValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (controlledValue !== undefined) setValue(controlledValue)
  }, [controlledValue])

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => onSearch(value), debounceMs)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs])

  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400',
          size === 'lg' ? 'size-5' : 'size-4'
        )}
      />
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.(value)
        }}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-md border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400',
          size === 'lg' ? 'h-12 py-2.5 pl-11 text-base' : 'h-10 py-2 pl-9 text-sm',
          value ? (size === 'lg' ? 'pr-11' : 'pr-9') : size === 'lg' ? 'pr-4' : 'pr-3',
          'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 focus:border-orange-500'
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue('')}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600',
            size === 'lg' ? 'right-4' : 'right-3'
          )}
        >
          <X className={size === 'lg' ? 'size-5' : 'size-4'} />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
