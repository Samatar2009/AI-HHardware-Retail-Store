import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'

const VARIANT_SIGNATURE_CLASS = {
  primary: 'bg-orange-500',
  secondary: 'border-stone-300',
  ghost: 'bg-transparent',
  destructive: 'bg-red-500',
  link: 'underline-offset-4',
} as const

describe('Button', () => {
  it.each(
    Object.entries(VARIANT_SIGNATURE_CLASS) as [keyof typeof VARIANT_SIGNATURE_CLASS, string][]
  )('renders the %s variant', (variant, signatureClass) => {
    render(<Button variant={variant}>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button.className).toContain(signatureClass)
  })

  it('prevents clicks while disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows a spinner and disables the button when loading', () => {
    render(<Button loading>Saving</Button>)
    const button = screen.getByRole('button', { name: 'Saving' })
    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('calls onClick when enabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
