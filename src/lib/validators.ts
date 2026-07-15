import { z } from 'zod'

// Somaliland mobile numbers: +252 followed by one of the valid carrier
// prefixes (App Flow doc Section 2 — 063, 065, 068, 061, 062, 066, with the
// leading trunk 0 dropped in E.164 form) and 7 more digits.
export const E164_SOMALILAND_PATTERN = /^\+252(63|65|68|61|62|66)\d{7}$/

// Local-dev-only relaxation so authentication can be tested with a real
// non-Somaliland phone number (Twilio can't deliver OTP SMS to a fake one).
// Never active outside `next dev` — production builds always require a
// Somaliland number. Scoped to auth only: mobile money phone validation
// (checkout/returns) uses E164_SOMALILAND_PATTERN directly and is untouched.
const DEV_TEST_E164_PATTERN = /^\+[1-9]\d{6,14}$/

export function isValidAuthPhone(phone: string): boolean {
  if (E164_SOMALILAND_PATTERN.test(phone)) return true
  return process.env.NODE_ENV === 'development' && DEV_TEST_E164_PATTERN.test(phone)
}

export const phoneE164Schema = z.string().refine(isValidAuthPhone, 'Enter a valid Somaliland phone number')

export const otpTokenSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code')
