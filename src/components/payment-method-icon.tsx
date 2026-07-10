import { Banknote, Smartphone } from 'lucide-react'

type PaymentMethodType = 'zaad' | 'edahab' | 'evc_plus' | 'sahal' | 'cash' | 'cash_on_pickup'

const LABELS: Record<PaymentMethodType, string> = {
  zaad: 'Zaad',
  edahab: 'eDahab',
  evc_plus: 'EVC Plus',
  sahal: 'Sahal',
  cash: 'Cash',
  cash_on_pickup: 'Cash on Pickup',
}

interface PaymentMethodIconProps {
  method: PaymentMethodType
  showLabel?: boolean
  className?: string
}

function PaymentMethodIcon({ method, showLabel = true, className }: PaymentMethodIconProps) {
  const isCash = method === 'cash' || method === 'cash_on_pickup'
  const Icon = isCash ? Banknote : Smartphone

  return (
    <span className={className ? className : 'inline-flex items-center gap-1.5 text-sm text-stone-700'}>
      <Icon className="size-5 text-stone-500" aria-hidden="true" />
      {showLabel && LABELS[method]}
    </span>
  )
}

export { PaymentMethodIcon }
