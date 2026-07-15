'use client'

import { forwardRef, useId, useState } from 'react'
import { AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      required,
      id,
      maxLength,
      onChange,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const textareaId = id ?? generatedId
    const [charCount, setCharCount] = useState(
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
          ? defaultValue.length
          : 0
    )

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-stone-700">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          onChange={(e) => {
            setCharCount(e.target.value.length)
            onChange?.(e)
          }}
          className={cn(
            'min-h-[80px] w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400',
            'transition-all duration-150 motion-reduce:transition-none motion-reduce:duration-0',
            'focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500',
            'disabled:cursor-not-allowed disabled:bg-stone-100',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        <div className="mt-1 flex items-center justify-between">
          <div>
            {error ? (
              <p
                id={`${textareaId}-error`}
                className="flex items-center gap-1 text-xs text-red-600"
              >
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {error}
              </p>
            ) : (
              helperText && (
                <p id={`${textareaId}-helper`} className="text-xs text-stone-500">
                  {helperText}
                </p>
              )
            )}
          </div>
          {maxLength && (
            <p className="text-xs text-stone-500">
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
