'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'borama-recent-searches'
const MAX_RECENT = 5

function readStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setRecent(readStorage())
  }, [])

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeSearch = useCallback((query: string) => {
    setRecent((prev) => {
      const next = prev.filter((q) => q !== query)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { recent, addSearch, removeSearch }
}

export { useRecentSearches }
