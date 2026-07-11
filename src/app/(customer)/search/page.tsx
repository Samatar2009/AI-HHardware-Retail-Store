'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Sparkles, X } from 'lucide-react'

import { SearchInput } from '@/components/forms/search-input'
import { ProductGrid } from '@/components/product-grid'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { useRecentSearches } from '@/hooks/use-recent-searches'
import type { ProductCardProps } from '@/components/product-card'

export default function SearchPage() {
  const { recent, addSearch, removeSearch } = useRecentSearches()
  const [query, setQuery] = useState('')
  const [keywordResults, setKeywordResults] = useState<ProductCardProps[]>([])
  const [semanticResults, setSemanticResults] = useState<ProductCardProps[]>([])
  const [hasSemanticSearched, setHasSemanticSearched] = useState(false)
  const [isSemanticLoading, setIsSemanticLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  async function handleKeywordSearch(value: string) {
    setQuery(value)
    if (!value.trim()) {
      setKeywordResults([])
      return
    }
    const res = await fetch(`/api/products?search=${encodeURIComponent(value)}&limit=12`)
    const data = await res.json()
    setKeywordResults(data.data ?? [])
  }

  async function handleSubmit(value: string) {
    if (!value.trim()) return
    addSearch(value)
    setShowSuggestions(false)
    setIsSemanticLoading(true)
    setHasSemanticSearched(true)
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value }),
      })
      const data = await res.json()
      setSemanticResults(data.results ?? [])
    } finally {
      setIsSemanticLoading(false)
    }
  }

  const noResults = query.trim() !== '' && keywordResults.length === 0 && hasSemanticSearched && semanticResults.length === 0 && !isSemanticLoading

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <div
        className="relative mx-auto max-w-2xl"
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
      >
        <SearchInput
          value={query}
          onSearch={handleKeywordSearch}
          onSubmit={handleSubmit}
          debounceMs={400}
          autoFocus
          size="lg"
          placeholder="Search for tools, materials, and more..."
          className="w-full"
        />

        {showSuggestions && recent.length > 0 && query.trim() === '' && (
          <div className="absolute z-20 mt-2 w-full rounded-md border border-stone-200 bg-white p-2 shadow-md">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-stone-500">
              Recent searches
            </p>
            {recent.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-stone-50">
                <button
                  type="button"
                  className="flex-1 text-left text-sm text-stone-700"
                  onClick={() => {
                    setQuery(item)
                    handleKeywordSearch(item)
                    handleSubmit(item)
                  }}
                >
                  {item}
                </button>
                <button type="button" aria-label="Remove search" onClick={() => removeSearch(item)}>
                  <X className="size-3.5 text-stone-400 hover:text-stone-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-10">
        {keywordResults.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-stone-900">Quick matches</h2>
            <ProductGrid products={keywordResults} />
          </section>
        )}

        {isSemanticLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-stone-500">
            <Spinner /> Searching with AI...
          </div>
        )}

        {!isSemanticLoading && hasSemanticSearched && semanticResults.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-stone-900">
              <Sparkles className="size-5 text-orange-500" aria-hidden="true" />
              AI-recommended results
            </h2>
            <ProductGrid products={semanticResults} />
          </section>
        )}

        {noResults && (
          <EmptyState
            icon={MessageCircle}
            title="No products found"
            description="Not finding what you need? Ask our AI assistant"
          />
        )}
        {noResults && (
          <div className="-mt-6 flex justify-center">
            <Link href="/ai/estimate" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Chat with our AI assistant →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
