import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const

interface SpinnerProps {
  size?: keyof typeof SIZES
  className?: string
}

function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn(SIZES[size], 'animate-spin text-orange-500', className)}
      aria-hidden="true"
    />
  )
}

export { Spinner }
