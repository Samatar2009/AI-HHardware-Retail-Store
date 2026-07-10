'use client'

import { useRef } from 'react'

import { cn } from '@/lib/utils'

const OTP_LENGTH = 6

export interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

function OtpInput({ value, onChange, error, disabled }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '')

  function setDigit(index: number, digit: string) {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join(''))
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setDigit(index, '')
      return
    }
    setDigit(index, raw[raw.length - 1])
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    onChange(pasted.padEnd(OTP_LENGTH, '').slice(0, OTP_LENGTH).replace(/\s/g, ''))
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div>
      <div className="flex gap-2" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
            className={cn(
              'h-12 w-10 rounded-md border border-stone-300 bg-white text-center text-lg font-semibold text-stone-900',
              'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
              'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 focus:border-orange-500',
              'disabled:cursor-not-allowed disabled:bg-stone-100',
              error && 'border-red-500 focus:ring-red-500'
            )}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export { OtpInput }
