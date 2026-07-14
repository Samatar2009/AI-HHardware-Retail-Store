import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OtpInput } from '@/components/forms/otp-input'

function ControlledOtpInput() {
  const [value, setValue] = useState('')
  return <OtpInput value={value} onChange={setValue} />
}

function getDigitInputs() {
  return Array.from(
    { length: 6 },
    (_, i) => screen.getByLabelText(`Digit ${i + 1} of 6`) as HTMLInputElement
  )
}

describe('OtpInput', () => {
  it('typing in the first box advances focus to the second', () => {
    render(<ControlledOtpInput />)
    const inputs = getDigitInputs()

    fireEvent.change(inputs[0]!, { target: { value: '1' } })

    expect(inputs[0]!.value).toBe('1')
    expect(document.activeElement).toBe(inputs[1])
  })

  it('pasting 6 digits fills all boxes', () => {
    render(<ControlledOtpInput />)
    const inputs = getDigitInputs()

    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => '123456' },
    })

    const filled = getDigitInputs()
    expect(filled.map((i) => i.value)).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('backspace on an empty box moves focus to the previous box', () => {
    render(<ControlledOtpInput />)
    const inputs = getDigitInputs()

    fireEvent.change(inputs[0]!, { target: { value: '1' } })
    // Focus is now on inputs[1], which is empty.
    fireEvent.keyDown(inputs[1]!, { key: 'Backspace' })

    expect(document.activeElement).toBe(inputs[0])
  })

  it('backspace on a non-empty box does not move focus', () => {
    render(<ControlledOtpInput />)
    const inputs = getDigitInputs()

    fireEvent.change(inputs[0]!, { target: { value: '1' } })
    fireEvent.change(inputs[1]!, { target: { value: '2' } })
    inputs[1]!.focus()
    fireEvent.keyDown(inputs[1]!, { key: 'Backspace' })

    expect(document.activeElement).toBe(inputs[1])
  })

  it('shows the error message when provided', () => {
    render(<OtpInput value="" onChange={() => {}} error="Invalid code" />)
    expect(screen.getByText('Invalid code')).toBeInTheDocument()
  })
})
