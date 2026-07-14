import { describe, expect, it } from 'vitest'

import { cn, formatDate, formatSLSH, getInitials, slshToUsd, truncate } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('resolves conflicting Tailwind classes to the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('drops falsy values', () => {
    expect(cn('px-2', false && 'hidden', undefined, null, 'py-1')).toBe('px-2 py-1')
  })
})

describe('formatSLSH', () => {
  it('formats an amount with thousands separators and the SLSH suffix', () => {
    expect(formatSLSH(125000)).toBe('125,000 SLSH')
  })

  it('formats zero', () => {
    expect(formatSLSH(0)).toBe('0 SLSH')
  })
})

describe('slshToUsd', () => {
  it('converts SLSH to a USD string using the given rate', () => {
    expect(slshToUsd(570000, 570)).toBe('$1000.00')
  })

  it('rounds to two decimal places', () => {
    expect(slshToUsd(100, 3)).toBe('$33.33')
  })
})

describe('formatDate', () => {
  it('formats an ISO string as a short English date', () => {
    // Midday UTC avoids the date shifting by a day in timezones on either
    // side of UTC when toLocaleDateString() renders in the local timezone.
    expect(formatDate('2025-07-12T12:00:00.000Z')).toBe('Jul 12, 2025')
  })
})

describe('getInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getInitials('Ahmed Ali')).toBe('AA')
  })

  it('handles a single name', () => {
    expect(getInitials('Ahmed')).toBe('A')
  })

  it('ignores extra whitespace', () => {
    expect(getInitials('  Ahmed   Ali   Warsame  ')).toBe('AA')
  })
})

describe('truncate', () => {
  it('leaves short text untouched', () => {
    expect(truncate('Hammer', 20)).toBe('Hammer')
  })

  it('truncates long text and appends an ellipsis', () => {
    expect(truncate('Portland Cement 50kg Bag', 10)).toBe('Portland C…')
  })
})
