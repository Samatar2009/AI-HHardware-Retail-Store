import { describe, expect, it } from 'vitest'

import { OTP_LOCK_SECONDS, OTP_MAX_ATTEMPTS, otpAttemptsKey, otpLockKey } from '@/lib/otp-lock'

describe('otp-lock constants and key helpers', () => {
  it('locks out after 3 attempts for 15 minutes', () => {
    expect(OTP_MAX_ATTEMPTS).toBe(3)
    expect(OTP_LOCK_SECONDS).toBe(15 * 60)
  })

  it('builds a distinct Redis key per phone number for attempts', () => {
    expect(otpAttemptsKey('+252637000000')).toBe('otp-attempts:+252637000000')
    expect(otpAttemptsKey('+252637000001')).toBe('otp-attempts:+252637000001')
  })

  it('builds a distinct Redis key per phone number for the lock flag', () => {
    expect(otpLockKey('+252637000000')).toBe('otp-lock:+252637000000')
  })

  it('keeps attempts and lock keys in separate namespaces for the same phone', () => {
    const phone = '+252637000000'
    expect(otpAttemptsKey(phone)).not.toBe(otpLockKey(phone))
  })
})
