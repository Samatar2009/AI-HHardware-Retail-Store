import { create } from 'zustand'

import type { Locale } from '@/i18n/config'

interface UiState {
  sidebarOpen: boolean
  activeLanguage: Locale
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setActiveLanguage: (locale: Locale) => void
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: false,
  activeLanguage: 'en',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveLanguage: (locale) => set({ activeLanguage: locale }),
}))
