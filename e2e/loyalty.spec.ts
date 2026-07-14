import { test, expect } from '@playwright/test'

import { signIn } from './helpers/auth'

// Loyalty points are awarded immediately by the trg_award_loyalty_points
// trigger on pos_transactions when a customer is linked to a POS sale — no
// separate staff confirmation step, unlike the online-order path (which
// awards on completion, not creation). That makes a single cashier-linked
// POS sale the most deterministic way to exercise "earn points -> see them
// reflected on /loyalty" in one test, using two browser contexts (cashier +
// customer) rather than orchestrating the full online order lifecycle.
const cashierPhone = process.env.E2E_CASHIER_PHONE
const cashierOtp = process.env.E2E_CASHIER_OTP
const customerPhone = process.env.E2E_LOYALTY_CUSTOMER_PHONE
const customerOtp = process.env.E2E_LOYALTY_CUSTOMER_OTP
const sku = process.env.E2E_TEST_SKU

test.describe('Loyalty points', () => {
  test.skip(
    !cashierPhone || !cashierOtp || !customerPhone || !customerOtp || !sku,
    'E2E_CASHIER_* / E2E_LOYALTY_CUSTOMER_* / E2E_TEST_SKU not configured'
  )

  test('awards points on a linked POS sale and reflects them on the loyalty page', async ({
    browser,
  }) => {
    const customerContext = await browser.newContext()
    const customerPage = await customerContext.newPage()
    await signIn(customerPage, customerPhone!, customerOtp!)
    await customerPage.goto('/loyalty')
    const pointsBefore = Number(
      (await customerPage.getByText(/^\d+$/).first().textContent()) ?? '0'
    )

    const cashierContext = await browser.newContext()
    const cashierPage = await cashierContext.newPage()
    await signIn(cashierPage, cashierPhone!, cashierOtp!)
    await cashierPage.waitForURL(/\/pos/)
    if (cashierPage.url().includes('/open-session')) {
      await cashierPage.getByLabel('Starting Cash (SLSH)').fill('100000')
      await cashierPage.getByRole('button', { name: 'Open Register' }).click()
      await cashierPage.waitForURL(/\/pos$/)
    }

    await cashierPage.getByPlaceholder('Search by name or SKU...').fill(sku!)
    await cashierPage.getByText(new RegExp(sku!, 'i')).first().click()

    await cashierPage.getByPlaceholder('Phone number').fill(customerPhone!)
    await cashierPage.getByRole('button', { name: 'Lookup' }).click()
    await expect(cashierPage.getByText(customerPhone!)).toBeVisible()

    const totalText = await cashierPage.getByRole('button', { name: /^Charge / }).textContent()
    const totalSlsh = Number(totalText?.replace(/[^\d]/g, '') ?? '0')

    await cashierPage.getByRole('button', { name: /^Charge / }).click()
    await cashierPage.getByRole('button', { name: 'Complete Sale' }).click()
    await expect(cashierPage.getByText('Sale complete')).toBeVisible({ timeout: 15000 })

    // POINTS_PER_SLSH = 0.001 (1 point per 1,000 SLSH) — src/lib/constants.ts.
    const expectedPointsEarned = Math.floor(totalSlsh / 1000)

    await customerPage.reload()
    const pointsAfter = Number((await customerPage.getByText(/^\d+$/).first().textContent()) ?? '0')
    expect(pointsAfter - pointsBefore).toBe(expectedPointsEarned)

    await customerContext.close()
    await cashierContext.close()
  })
})
