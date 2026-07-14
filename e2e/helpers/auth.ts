import { expect, type Page } from '@playwright/test'

/**
 * Signs in via the real phone-OTP flow (src/app/(auth)/sign-in and /verify).
 * Requires a Twilio "magic number" test credential configured on the target
 * Supabase project's Auth settings, whose fixed OTP Twilio returns without
 * sending a real SMS — see https://www.twilio.com/docs/iam/test-credentials.
 * Configure via env vars rather than hardcoding real numbers/codes:
 *   E2E_TEST_PHONE  — a Somaliland-format (+252...) Twilio test number
 *   E2E_TEST_OTP    — the fixed 6-digit code Twilio returns for it
 */
export function getTestCredentials() {
  const phone = process.env.E2E_TEST_PHONE
  const otp = process.env.E2E_TEST_OTP
  return { phone, otp }
}

export async function signIn(page: Page, phone: string, otp: string) {
  await page.goto('/sign-in')
  await page.getByLabel(/phone/i).fill(phone)
  await page.getByRole('button', { name: /send code/i }).click()

  await page.waitForURL(/\/verify/)
  const digitInputs = page.getByLabel(/Digit \d of 6/)
  for (let i = 0; i < otp.length; i++) {
    await digitInputs.nth(i).fill(otp[i]!)
  }
  await page.getByRole('button', { name: /verify/i }).click()
  await expect(page).not.toHaveURL(/\/verify/)
}
