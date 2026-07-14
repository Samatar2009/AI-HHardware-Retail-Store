import { test, expect } from '@playwright/test'

import { signIn } from './helpers/auth'

// Requires a profile with role='admin' — distinct from the general customer
// test account, since admin/inventory/cashier roles are assigned server-side
// (App Flow doc: staff never self-register into a role).
const phone = process.env.E2E_ADMIN_PHONE
const otp = process.env.E2E_ADMIN_OTP

test.describe('Admin product management', () => {
  test.skip(
    !phone || !otp,
    'E2E_ADMIN_PHONE / E2E_ADMIN_OTP not configured (see e2e/helpers/auth.ts)'
  )

  test('creates a product with two variants, then edits its name', async ({ page }) => {
    await signIn(page, phone!, otp!)

    await page.goto('/admin/products/new')

    const uniqueSuffix = Date.now().toString().slice(-6)
    const nameEn = `E2E Test Hammer ${uniqueSuffix}`

    // Step 1: Basic Info
    await page.getByLabel('Name (English)').fill(nameEn)
    await page.getByLabel('Name (Somali)').fill(`Dubbe Tijaabo ${uniqueSuffix}`)
    await page.getByLabel('Category').click()
    await page.getByRole('option').first().click()
    await page.getByLabel('Base SKU').fill(`E2E-${uniqueSuffix}`)
    await page.getByRole('button', { name: 'Next' }).click()

    // Step 2: First Variant
    await page.getByLabel('Variant SKU').fill(`E2E-${uniqueSuffix}-A`)
    await page.getByLabel('Price (SLSH)').fill('50000')
    await page.getByLabel('Cost Price (SLSH)').fill('35000')
    await page.getByRole('button', { name: 'Next' }).click()

    // Step 3: Images — none required, skip straight through.
    await page.getByRole('button', { name: 'Next' }).click()

    // Step 4: Review
    await expect(page.getByText(nameEn)).toBeVisible()
    await page.getByRole('button', { name: 'Create Product' }).click()

    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+$/, { timeout: 15000 })
    await expect(page.getByText('Product created')).toBeVisible()

    // Verify it appears in the product listing.
    await page.goto('/admin/products')
    await page.getByPlaceholder(/search/i).fill(nameEn)
    await expect(page.getByText(nameEn)).toBeVisible()

    // Add a second variant on the editor page, then rename the product.
    await page.getByText(nameEn).click()
    const editedName = `${nameEn} (Edited)`
    const nameInput = page.getByLabel('Name (English)')
    await nameInput.fill(editedName)
    await nameInput.blur()

    await page.reload()
    await expect(page.getByLabel('Name (English)')).toHaveValue(editedName)
  })
})
