'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import toast, { Toaster, useToasterStore } from 'react-hot-toast'

import { AppTooltipProvider } from '@/components/ui/tooltip'

const MAX_VISIBLE_TOASTS = 3

// Guidelines Section 8.8: max 3 toasts stacked, oldest auto-dismiss first.
function ToastLimiter() {
  const { toasts } = useToasterStore()

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .slice(MAX_VISIBLE_TOASTS)
      .forEach((t) => toast.dismiss(t.id))
  }, [toasts])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AppTooltipProvider>{children}</AppTooltipProvider>
      <ToastLimiter />
      <Toaster
        position="top-right"
        gutter={12}
        containerClassName="!bottom-20 !left-1/2 !-translate-x-1/2 sm:!bottom-auto sm:!left-auto sm:!top-16 sm:!right-4 sm:!translate-x-0"
      />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
