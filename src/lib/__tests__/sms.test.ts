import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.mock() factories are hoisted above the rest of the module, so a plain
// `const createMessage = vi.fn()` above it would still be in its temporal
// dead zone when the factory runs — vi.hoisted() runs before that hoisting.
const { createMessage } = vi.hoisted(() => ({ createMessage: vi.fn() }))

vi.mock('twilio', () => ({
  default: vi.fn(() => ({ messages: { create: createMessage } })),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/sms'
import { chainable } from '@/test/mock-supabase'

describe('sendSms', () => {
  beforeEach(() => {
    createMessage.mockReset()
  })

  it('logs a sent message with the Twilio SID on success', async () => {
    createMessage.mockResolvedValue({ sid: 'SM123' })
    const insert = vi.fn(() => chainable({ data: null, error: null }))
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ insert })) } as never)

    await sendSms('+252637000000', 'Your order is ready', 'order_ready')

    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+252637000000', body: 'Your order is ready' })
    )
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', twilio_sid: 'SM123', trigger_event: 'order_ready' })
    )
  })

  it('logs a failed message and rethrows when Twilio errors', async () => {
    createMessage.mockRejectedValue(new Error('Invalid phone number'))
    const insert = vi.fn(() => chainable({ data: null, error: null }))
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ insert })) } as never)

    await expect(sendSms('+252000000000', 'Test')).rejects.toThrow('Invalid phone number')

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error_code: 'Invalid phone number' })
    )
  })

  it('defaults triggerEvent to "manual" when not provided', async () => {
    createMessage.mockResolvedValue({ sid: 'SM456' })
    const insert = vi.fn(() => chainable({ data: null, error: null }))
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ insert })) } as never)

    await sendSms('+252637000000', 'Hello')

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ trigger_event: 'manual' }))
  })
})
