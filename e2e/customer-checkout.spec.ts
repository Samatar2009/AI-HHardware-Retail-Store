import { test, expect } from '@playwright/test'

import { getTestCredentials, signIn } from './helpers/auth'

const { phone, otp } = getTestCredentials()

test.describe('Customer checkout', () => {
  test.skip(
    !phone || !otp,
    'E2E_TEST_PHONE / E2E_TEST_OTP not configured (see e2e/helpers/auth.ts)'
  )

  test('browses products, adds to cart, applies a discount code, and places an order', async ({
    page,
  }) => {
    await signIn(page, phone!, otp!)

    await page.goto('/products')
    const firstProduct = page.locator('a[href^="/products/"]').first()
    await firstProduct.click()

    await page.getByRole('button', { name: /add to cart/i }).click()

    await page.goto('/cart')
    // Requires a seeded pickup location to auto-select before checkout unlocks.
    await expect(page.getByRole('button', { name: /checkout/i })).toBeEnabled({ timeout: 10000 })

    // A valid, unexpired, unlimited discount code seeded for the test account.
    const discountCode = process.env.E2E_TEST_DISCOUNT_CODE
    if (discountCode) {
      await page.getByPlaceholder('Discount code').fill(discountCode)
      await page.getByRole('button', { name: /apply/i }).click()
      await expect(page.getByText(new RegExp(`${discountCode} applied`, 'i'))).toBeVisible()
    }

    await page.getByRole('button', { name: /checkout/i }).click()
    await expect(page).toHaveURL(/\/checkout/)

    // Cash on Pickup requires no extra fields — the simplest deterministic path.
    await page.getByRole('radio', { name: /cash on pickup/i }).check()
    await page.getByRole('button', { name: /place order/i }).click()

    await expect(page).toHaveURL(/\/order-confirmation\//, { timeout: 15000 })

    await page.goto('/orders')
    await expect(page.getByText(/BH-\d{4}-\d+/).first()).toBeVisible()
  })
})
