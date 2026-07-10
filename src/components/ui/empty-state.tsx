import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

function EmptyState({ icon: Icon, title, description, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="flex size-24 items-center justify-center rounded-full bg-orange-100">
        <Icon className="size-12 text-orange-500" aria-hidden="true" />
      </div>
      <h3 className="text-center text-lg font-semibold text-stone-900">{title}</h3>
      {description && <p className="max-w-xs text-center text-sm text-stone-500">{description}</p>}
      {ctaLabel && (
        <Button variant="primary" size="md" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
