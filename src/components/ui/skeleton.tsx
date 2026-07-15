import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'skeleton animate-pulse rounded bg-stone-200 motion-reduce:animate-none',
        className
      )}
      {...props}
    />
  )
}

// Preset shapes from Guidelines Section 8.9.
const SkeletonText = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-4 w-full', className)} />
)
const SkeletonTextPartial = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-4 w-3/4', className)} />
)
const SkeletonTextShort = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-4 w-1/2', className)} />
)
const SkeletonAvatar = ({ className }: { className?: string }) => (
  <Skeleton className={cn('size-10 rounded-full', className)} />
)
const SkeletonProductImage = ({ className }: { className?: string }) => (
  <Skeleton className={cn('aspect-square w-full rounded-lg', className)} />
)
const SkeletonButton = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-10 w-28 rounded-md', className)} />
)
const SkeletonStatCard = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-24 w-full rounded-md', className)} />
)
const SkeletonTableRow = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-12 w-full rounded', className)} />
)

export {
  Skeleton,
  SkeletonText,
  SkeletonTextPartial,
  SkeletonTextShort,
  SkeletonAvatar,
  SkeletonProductImage,
  SkeletonButton,
  SkeletonStatCard,
  SkeletonTableRow,
}
