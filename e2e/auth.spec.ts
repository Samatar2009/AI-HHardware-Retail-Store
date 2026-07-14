import { test, expect } from '@playwright/test'

import { getTestCredentials, signIn } from './helpers/auth'

const { phone, otp } = getTestCredentials()

test.describe('Phone OTP authentication', () => {
  test.skip(
    !phone || !otp,
    'E2E_TEST_PHONE / E2E_TEST_OTP not configured (see e2e/helpers/auth.ts)'
  )

  test('signs in with phone + OTP, lands on home, and signs out', async ({ page }) => {
    await signIn(page, phone!, otp!)

    // Verify session actually took: sign-in/verify are no longer reachable
    // without redirecting straight back to an authenticated destination.
    await expect(page).toHaveURL(/\/$|\/admin|\/pos|\/inventory|\/staff|\/complete-profile/)

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('shows an error for an invalid OTP instead of crashing', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel(/phone/i).fill(phone!)
    await page.getByRole('button', { name: /send code/i }).click()
    await page.waitForURL(/\/verify/)

    const digitInputs = page.getByLabel(/Digit \d of 6/)
    for (let i = 0; i < 6; i++) {
      await digitInputs.nth(i).fill('0')
    }
    await page.getByRole('button', { name: /verify/i }).click()

    await expect(page.getByText(/invalid|incorrect|expired/i)).toBeVisible()
    await expect(page).toHaveURL(/\/verify/)
  })
})
