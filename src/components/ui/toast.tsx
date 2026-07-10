import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react'
import toast, { type Toast } from 'react-hot-toast'

import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
}

const ICON_COLOURS: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
  loading: 'text-orange-500',
}

const BORDER_COLOURS: Record<ToastType, string> = {
  success: 'border-green-200',
  error: 'border-red-200',
  warning: 'border-amber-200',
  info: 'border-blue-200',
  loading: 'border-stone-200',
}

interface BrandedToastProps {
  t: Toast
  type: ToastType
  title: string
  description?: string
}

function BrandedToast({ t, type, title, description }: BrandedToastProps) {
  const Icon = ICONS[type]

  return (
    <div
      className={cn(
        'flex w-80 min-w-0 items-start gap-3 rounded-md border bg-white p-4 shadow-md',
        'transition-all duration-200 motion-reduce:transition-none motion-reduce:duration-0',
        BORDER_COLOURS[type],
        t.visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <Icon
        className={cn('size-5 shrink-0', ICON_COLOURS[type], type === 'loading' && 'animate-spin')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
      </div>
      {type !== 'loading' && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => toast.dismiss(t.id)}
          className="ml-auto self-start text-stone-400 transition-colors duration-100 hover:text-stone-600"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function showToast(type: ToastType, title: string, description?: string) {
  return toast.custom((t) => <BrandedToast t={t} type={type} title={title} description={description} />, {
    duration: type === 'loading' ? Infinity : 4000,
  })
}

export const showSuccessToast = (title: string, description?: string) => showToast('success', title, description)
export const showErrorToast = (title: string, description?: string) => showToast('error', title, description)
export const showWarningToast = (title: string, description?: string) => showToast('warning', title, description)
export const showInfoToast = (title: string, description?: string) => showToast('info', title, description)
export const showLoadingToast = (title: string, description?: string) => showToast('loading', title, description)
export const dismissToast = (id: string) => toast.dismiss(id)
