import { z } from 'zod'

// Somaliland mobile numbers: +252 followed by one of the valid carrier
// prefixes (App Flow doc Section 2 — 063, 065, 068, 061, 062, 066, with the
// leading trunk 0 dropped in E.164 form) and 7 more digits.
export const E164_SOMALILAND_PATTERN = /^\+252(63|65|68|61|62|66)\d{7}$/

export const phoneE164Schema = z.string().regex(E164_SOMALILAND_PATTERN, 'Enter a valid Somaliland phone number')

export const otpTokenSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code')
