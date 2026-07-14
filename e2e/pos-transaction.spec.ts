import { test, expect } from '@playwright/test'

import { signIn } from './helpers/auth'

// Requires a profile with role='cashier' and a seeded product/variant whose
// SKU is E2E_TEST_SKU, available at the cashier's assigned location.
const phone = process.env.E2E_CASHIER_PHONE
const otp = process.env.E2E_CASHIER_OTP
const sku = process.env.E2E_TEST_SKU

test.describe('POS cash sale', () => {
  test.skip(
    !phone || !otp || !sku,
    'E2E_CASHIER_PHONE / E2E_CASHIER_OTP / E2E_TEST_SKU not configured'
  )

  test('opens a session, sells a product for cash, and completes the sale', async ({ page }) => {
    await signIn(page, phone!, otp!)

    // POS redirects to /pos/open-session automatically when there's no
    // active session (src/app/pos/page.tsx bootstrap()).
    await page.waitForURL(/\/pos/)
    if (page.url().includes('/open-session')) {
      await page.getByLabel('Starting Cash (SLSH)').fill('100000')
      await page.getByRole('button', { name: 'Open Register' }).click()
      await page.waitForURL(/\/pos$/)
    }

    await page.getByPlaceholder('Search by name or SKU...').fill(sku!)
    await page.getByText(new RegExp(sku!, 'i')).first().click()

    // Item added — cart is no longer empty and the charge button reflects a total.
    await expect(page.getByText('Cart is empty')).not.toBeVisible()
    const chargeButton = page.getByRole('button', { name: /^Charge / })
    await expect(chargeButton).toBeEnabled()

    await chargeButton.click()
    await expect(page.getByRole('heading', { name: /^Charge / })).toBeVisible()

    // Default payment line is a single cash tender pre-filled with the exact
    // total, so no changes are needed before completing the sale.
    await page.getByRole('button', { name: 'Complete Sale' }).click()

    await expect(page.getByText('Sale complete')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Cart is empty')).toBeVisible()
  })
})
