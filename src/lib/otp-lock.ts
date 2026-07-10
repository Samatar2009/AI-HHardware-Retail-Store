// Shared Redis key helpers for the OTP failed-attempt lockout
// (App Flow doc Section 2.6: 3 wrong codes locks the phone for 15 minutes).
export const OTP_MAX_ATTEMPTS = 3
export const OTP_LOCK_SECONDS = 15 * 60

export function otpAttemptsKey(phone: string) {
  return `otp-attempts:${phone}`
}

export function otpLockKey(phone: string) {
  return `otp-lock:${phone}`
}
