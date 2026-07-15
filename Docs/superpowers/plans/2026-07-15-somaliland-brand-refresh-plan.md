# Somaliland Brand Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Borama Hardware a distinct visual identity (secondary/sand color tokens, category-icon placeholder imagery, and three real launch banners) per the approved design spec at `Docs/superpowers/specs/2026-07-15-somaliland-brand-refresh-design.md`.

**Architecture:** Two new CSS custom properties feed a new `CategoryIcon` component (built from already-installed `lucide-react` icons, not hand-drawn SVG paths — lower-risk and visually consistent with the rest of the app). `CategoryIcon` replaces the empty/generic-icon fallback in `CategoryCard` and `ProductCard`, which requires threading a `categoryNameEn` field through `src/lib/catalog.ts` and three API routes that currently don't select it. Separately, a one-off Node script renders the three approved banner mockups to real WebP images via a headless browser, uploads them through the existing Storage/DB pipeline, and seeds the `banners` table — no schema or component changes needed there.

**Tech Stack:** Next.js 14 / React / TypeScript, Tailwind CSS, Supabase (Postgres + Storage), Vitest + Testing Library, Playwright (already a dev dependency, reused here for a screenshot-generation script, not just E2E), sharp (already used identically in `src/app/api/admin/upload/route.ts`).

## Global Constraints

- Trademark boundary: nothing added here may reproduce Home Hardware's actual logo, wordmark, or red/white identity — only the "warm neighborly local store" tone, via original color/imagery choices. (Spec "Trademark boundary" section.)
- All Somali text in this plan (banner headlines/subtitles/CTAs) is copied verbatim from the approved spec — never paraphrase or re-translate it.
- `tsc --noEmit`, `eslint`, `prettier --check`, and `vitest run` must stay green after every task (matches this project's existing Phase 13 checkpoint bar).
- Follow existing codebase conventions exactly where they conflict with the spec's literal wording — e.g. `tailwind.config.ts` already documents "no custom colour tokens... components reference Tailwind's built-in palette directly," so this plan uses Tailwind's built-in `teal-600` (which is already the exact hex `#0D9488`) instead of inventing a new token for it.
- No task in this plan touches `messages/so.json`, product photography, typography, or layout — all explicitly out of scope per the spec.

---

### Task 1: Design tokens — secondary/sand CSS custom properties

**Files:**
- Modify: `src/app/globals.css:8-14` (the `:root` block)

**Interfaces:**
- Produces: two new CSS custom properties, `--color-secondary` and `--color-sand`, in the same `R G B` space-separated format as the existing `--color-primary`. These are consumed later only by the standalone banner-generation script (Task 7), which hardcodes the same hex values directly since it runs outside the Next.js/Tailwind build — the CSS vars exist for the documented "raw value needed outside a className" case already established by this file's own comment.
- Note: teal does NOT get a new token — Tailwind's built-in `teal-600` class already equals `#0D9488` exactly, and Task 2 uses that class directly, matching `tailwind.config.ts`'s existing "use the built-in palette" convention.

- [ ] **Step 1: Add the two new custom properties**

In `src/app/globals.css`, change:

```css
  :root {
    /* Brand colours (Guidelines Section 2.1) — components should reference
       Tailwind's orange-* classes directly; these vars exist for the rare
       case a raw value is needed outside a className (e.g. canvas, SVG). */
    --color-primary: 249 115 22; /* #F97316 — orange-500 */
    --color-primary-dark: 234 88 12; /* #EA580C — orange-600 */
  }
```

to:

```css
  :root {
    /* Brand colours (Guidelines Section 2.1) — components should reference
       Tailwind's orange-* classes directly; these vars exist for the rare
       case a raw value is needed outside a className (e.g. canvas, SVG). */
    --color-primary: 249 115 22; /* #F97316 — orange-500 */
    --color-primary-dark: 234 88 12; /* #EA580C — orange-600 */

    /* Somaliland brand refresh (Docs/superpowers/specs/2026-07-15-somaliland-brand-refresh-design.md).
       --color-secondary duplicates Tailwind's built-in teal-600 (used directly
       via className elsewhere) only for the same raw-value-outside-a-className
       case as the vars above — the banner-generation script in
       src/scripts/generate-brand-banners.ts hardcodes this same hex since it
       renders HTML outside the Next.js build. */
    --color-secondary: 13 148 136; /* #0D9488 — teal-600 */
    --color-sand: 253 246 236; /* #FDF6EC */
  }
```

- [ ] **Step 2: Verify the file is still valid CSS and nothing else changed**

Run: `git diff src/app/globals.css`
Expected: only the `:root` block changes shown above — no other lines touched.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add secondary/sand color tokens for Somaliland brand refresh"
```

---

### Task 2: `CategoryIcon` component

**Files:**
- Create: `src/components/category-icon.tsx`
- Test: `src/components/__tests__/category-icon.test.tsx`

**Interfaces:**
- Produces: `CategoryIcon({ categoryNameEn, className }: { categoryNameEn?: string | null; className?: string })` — a React component. Renders one `lucide-react` icon matched by category name (case-insensitive), or a `Package` icon if the name doesn't match any known category. Accepts and forwards `className` to the underlying icon (so callers control size/color exactly like they already do with raw `lucide-react` icons elsewhere in this codebase, e.g. `CategoryCard`'s current `<LayoutGrid className="size-8 text-orange-500" />`).
- Consumes: nothing beyond `lucide-react` (already an installed dependency, version `0.454.0` per `package.json`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/category-icon.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CategoryIcon } from '@/components/category-icon'

describe('CategoryIcon', () => {
  it.each([
    ['Power Tools', 'lucide-drill'],
    ['Hand Tools', 'lucide-wrench'],
    ['Building Materials', 'lucide-brick-wall'],
    ['Plumbing', 'lucide-droplet'],
    ['Electrical', 'lucide-zap'],
  ])('renders the %s icon', (categoryNameEn, expectedClass) => {
    const { container } = render(<CategoryIcon categoryNameEn={categoryNameEn} />)
    expect(container.querySelector(`.${expectedClass}`)).toBeInTheDocument()
  })

  it('matches case-insensitively', () => {
    const { container } = render(<CategoryIcon categoryNameEn="power tools" />)
    expect(container.querySelector('.lucide-drill')).toBeInTheDocument()
  })

  it('falls back to a generic package icon for an unknown category', () => {
    const { container } = render(<CategoryIcon categoryNameEn="Paint & Sundries" />)
    expect(container.querySelector('.lucide-package')).toBeInTheDocument()
  })

  it('falls back to a generic package icon when no category name is given', () => {
    const { container } = render(<CategoryIcon categoryNameEn={null} />)
    expect(container.querySelector('.lucide-package')).toBeInTheDocument()
  })

  it('forwards className to the rendered icon', () => {
    const { container } = render(
      <CategoryIcon categoryNameEn="Electrical" className="size-8 text-orange-500" />
    )
    const icon = container.querySelector('.lucide-zap')
    expect(icon).toHaveClass('size-8', 'text-orange-500')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/category-icon.test.tsx`
Expected: FAIL — `Cannot find module '@/components/category-icon'`

- [ ] **Step 3: Write the component**

Create `src/components/category-icon.tsx`:

```tsx
import { BrickWall, Drill, Droplet, Package, Wrench, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Matches the 5 top-level categories seeded today (see `categories` table).
// Deliberately name-keyed rather than id-keyed: `categories` has no stable
// slug column (see the comment in src/app/(customer)/categories/[slug]/page.tsx),
// so name_en is the only reasonably-stable identifier available to callers.
// An unmatched name (a future category the store adds later) safely falls
// back to the generic Package icon rather than erroring.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'power tools': Drill,
  'hand tools': Wrench,
  'building materials': BrickWall,
  plumbing: Droplet,
  electrical: Zap,
}

interface CategoryIconProps {
  categoryNameEn?: string | null
  className?: string
}

function CategoryIcon({ categoryNameEn, className }: CategoryIconProps) {
  const Icon = (categoryNameEn && CATEGORY_ICONS[categoryNameEn.toLowerCase()]) || Package
  return <Icon className={className} aria-hidden="true" />
}

export { CategoryIcon }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/category-icon.test.tsx`
Expected: PASS — 8 tests (5 from `it.each` + 3 more).

- [ ] **Step 5: Commit**

```bash
git add src/components/category-icon.tsx src/components/__tests__/category-icon.test.tsx
git commit -m "feat: add CategoryIcon component for category placeholder imagery"
```

---

### Task 3: Wire `CategoryIcon` into `CategoryCard`

**Files:**
- Modify: `src/components/category-card.tsx`
- Test: `src/components/__tests__/category-card.test.tsx` (new file — none exists today)

**Interfaces:**
- Consumes: `CategoryIcon` from Task 2 (`{ categoryNameEn, className }`).
- No change to `CategoryCardProps` — it already receives `nameEn`, which is exactly what `CategoryIcon` needs.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/category-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useLocale: () => 'en' }))

import { CategoryCard } from '@/components/category-card'

describe('CategoryCard', () => {
  it('renders the category name and links to its slug', () => {
    render(<CategoryCard slug="power-tools" nameEn="Power Tools" nameSo="Qalabka Korontada" />)
    expect(screen.getByText('Power Tools')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/categories/power-tools')
  })

  it('renders an uploaded icon image when iconUrl is set', () => {
    render(
      <CategoryCard
        slug="power-tools"
        nameEn="Power Tools"
        nameSo="Qalabka Korontada"
        iconUrl="https://example.com/icon.png"
      />
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/icon.png')
  })

  it('falls back to a category-specific CategoryIcon when iconUrl is not set', () => {
    const { container } = render(
      <CategoryCard slug="power-tools" nameEn="Power Tools" nameSo="Qalabka Korontada" />
    )
    expect(container.querySelector('.lucide-drill')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/category-card.test.tsx`
Expected: FAIL on the third test — `.lucide-drill` not found (currently renders `LayoutGrid`, i.e. `.lucide-layout-grid`).

- [ ] **Step 3: Update the component**

In `src/components/category-card.tsx`, replace:

```tsx
import { LayoutGrid } from 'lucide-react'
```

with:

```tsx
import { CategoryIcon } from '@/components/category-icon'
```

and replace:

```tsx
      <div className="flex size-16 items-center justify-center rounded-full bg-orange-100">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="size-8 object-contain" />
        ) : (
          <LayoutGrid className="size-8 text-orange-500" aria-hidden="true" />
        )}
      </div>
```

with:

```tsx
      <div className="flex size-16 items-center justify-center rounded-full bg-teal-50">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="size-8 object-contain" />
        ) : (
          <CategoryIcon categoryNameEn={nameEn} className="size-8 text-orange-500" />
        )}
      </div>
```

(The circle background changes from `bg-orange-100` to `bg-teal-50` so the fallback state reads as genuinely two-color — teal circle, orange icon — per the spec's "two-color (primary orange + secondary teal)" requirement. The uploaded-image branch is unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/category-card.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/category-card.tsx src/components/__tests__/category-card.test.tsx
git commit -m "feat: use CategoryIcon fallback in CategoryCard"
```

---

### Task 4: Thread `categoryNameEn` through `src/lib/catalog.ts`

**Files:**
- Modify: `src/lib/catalog.ts`
- Modify: `src/components/product-card.tsx` (the `ProductCardProps` interface only — rendering changes are Task 5)
- Test: `src/lib/__tests__/catalog.test.ts` (existing file — extend it)

**Interfaces:**
- Produces: `ProductCardProps.categoryNameEn?: string | null`; `toProductCardProps(product, locationId?)` now reads `product.category?.name_en` and includes it in its return value.
- Consumes: nothing new — this is a pure-function change.

- [ ] **Step 1: Write the failing test**

In `src/lib/__tests__/catalog.test.ts`, add a new test inside the existing `describe('toProductCardProps', ...)` block (after the last existing `it(...)`, before the closing `})`):

```ts
  it('passes through the category name when the product has a category', () => {
    const product = { ...baseProduct, category: { name_en: 'Power Tools' } }
    expect(toProductCardProps(product).categoryNameEn).toBe('Power Tools')
  })

  it('defaults categoryNameEn to null when the product has no category', () => {
    expect(toProductCardProps(baseProduct).categoryNameEn).toBeNull()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/catalog.test.ts`
Expected: FAIL — TypeScript error (`category` does not exist on type) or `categoryNameEn` is `undefined` rather than the expected value.

- [ ] **Step 3: Update `ProductCardProps`**

In `src/components/product-card.tsx`, in the `ProductCardProps` interface, add one field after `brand`:

```ts
export interface ProductCardProps {
  id: string
  nameEn: string
  nameSo: string
  brand?: string | null
  categoryNameEn?: string | null
  thumbnailUrl?: string | null
  priceSlsh: number
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  onAddToCart?: () => void
}
```

- [ ] **Step 4: Update `catalog.ts`**

In `src/lib/catalog.ts`, add a `category` field to the `ProductForCard` interface:

```ts
interface ProductForCard {
  id: string
  name_en: string
  name_so: string
  brand: string | null
  category?: { name_en: string } | null
  product_images: ImageRow[]
  product_variants: VariantWithInventory[]
}
```

and in `toProductCardProps`, add `categoryNameEn` to the returned object:

```ts
  return {
    id: product.id,
    nameEn: product.name_en,
    nameSo: product.name_so,
    brand: product.brand,
    categoryNameEn: product.category?.name_en ?? null,
    thumbnailUrl: image?.thumbnail_url ?? null,
    priceSlsh: prices.length ? Math.min(...prices) : 0,
    stockStatus: deriveStockStatus(product.product_variants, locationId),
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/catalog.test.ts`
Expected: PASS — 8 tests (6 existing + 2 new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/catalog.ts src/lib/__tests__/catalog.test.ts src/components/product-card.tsx
git commit -m "feat: thread categoryNameEn through toProductCardProps"
```

---

### Task 5: Render the `CategoryIcon` fallback in `ProductCard`

**Files:**
- Modify: `src/components/product-card.tsx`
- Test: `src/components/__tests__/product-card.test.tsx` (existing file — extend it)

**Interfaces:**
- Consumes: `CategoryIcon` from Task 2; `categoryNameEn` prop added to `ProductCardProps` in Task 4.

- [ ] **Step 1: Write the failing test**

In `src/components/__tests__/product-card.test.tsx`, add inside the existing `describe('ProductCard', ...)` block:

```tsx
  it('shows a category-specific fallback icon when there is no thumbnail', () => {
    const { container } = render(<ProductCard {...baseProps} categoryNameEn="Hand Tools" />)
    expect(container.querySelector('.lucide-wrench')).toBeInTheDocument()
  })

  it('does not show the fallback icon when a thumbnail is present', () => {
    const { container } = render(
      <ProductCard {...baseProps} categoryNameEn="Hand Tools" thumbnailUrl="https://example.com/hammer.jpg" />
    )
    expect(container.querySelector('.lucide-wrench')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/hammer.jpg')
  })
```

(`screen` is already imported in this file's existing `import { act, fireEvent, render, screen } from '@testing-library/react'` line — no new import needed.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/product-card.test.tsx`
Expected: FAIL — `.lucide-wrench` not found (the image container currently renders nothing when `thumbnailUrl` is falsy).

- [ ] **Step 3: Update the component**

In `src/components/product-card.tsx`, add the import:

```tsx
import { CategoryIcon } from '@/components/category-icon'
```

and add `categoryNameEn` to the destructured props:

```tsx
function ProductCard({
  id,
  nameEn,
  nameSo,
  brand,
  categoryNameEn,
  thumbnailUrl,
  priceSlsh,
  stockStatus,
  onAddToCart,
}: ProductCardProps) {
```

then replace:

```tsx
        <div className="aspect-square overflow-hidden bg-stone-100">
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            />
          )}
        </div>
```

with:

```tsx
        <div className="aspect-square overflow-hidden bg-teal-50">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CategoryIcon categoryNameEn={categoryNameEn} className="size-16 text-orange-500" />
            </div>
          )}
        </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/product-card.test.tsx`
Expected: PASS — 8 tests (6 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/product-card.tsx src/components/__tests__/product-card.test.tsx
git commit -m "feat: show CategoryIcon fallback on ProductCard when there is no photo"
```

---

### Task 6: Supply `categoryNameEn` from the 3 product API routes

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/featured/route.ts`
- Modify: `src/app/api/ai/search/route.ts`
- Test: `src/app/api/__tests__/products.test.ts` (new file — none exists today)

**Interfaces:**
- Consumes: `toProductCardProps` from Task 4, which now reads `product.category?.name_en`.
- Uses the `category:categories(name_en)` select syntax already established in this codebase (see `src/app/api/admin/products/route.ts:15`, `src/app/api/products/[id]/route.ts:12`, `src/app/api/inventory/route.ts:46`) — not a new pattern.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/__tests__/products.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/products/route'
import { chainable } from '@/test/mock-supabase'

function makeRequest(query = '') {
  return new Request(`http://localhost/api/products${query}`)
}

describe('GET /api/products', () => {
  it('includes categoryNameEn in each product from the joined category', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() =>
        chainable({
          data: [
            {
              id: 'p1',
              name_en: 'Claw Hammer',
              name_so: 'Dubbe',
              brand: 'Stanley',
              created_at: new Date().toISOString(),
              category: { name_en: 'Hand Tools' },
              product_images: [],
              product_variants: [{ price_slsh: 15000, is_active: true, inventory: [] }],
            },
          ],
          error: null,
        })
      ),
    } as never)

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].categoryNameEn).toBe('Hand Tools')
  })

  it('defaults categoryNameEn to null when the product has no category', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() =>
        chainable({
          data: [
            {
              id: 'p1',
              name_en: 'Claw Hammer',
              name_so: 'Dubbe',
              brand: 'Stanley',
              created_at: new Date().toISOString(),
              category: null,
              product_images: [],
              product_variants: [{ price_slsh: 15000, is_active: true, inventory: [] }],
            },
          ],
          error: null,
        })
      ),
    } as never)

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].categoryNameEn).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/__tests__/products.test.ts`
Expected: FAIL — `categoryNameEn` is `undefined`, not `'Hand Tools'` / `null` (the route doesn't select or pass `category` yet).

- [ ] **Step 3: Update the three routes**

In `src/app/api/products/route.ts`, change the `.select(...)` call from:

```ts
    .select(
      `id, name_en, name_so, brand, created_at,
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(id, price_slsh, is_active,
         inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
```

to:

```ts
    .select(
      `id, name_en, name_so, brand, created_at,
       category:categories(name_en),
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(id, price_slsh, is_active,
         inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
```

(`toProductCardProps` already reads `product.category?.name_en` as of Task 4 — no other change needed in this file, since `enriched` just spreads whatever `toProductCardProps` returns.)

In `src/app/api/products/featured/route.ts`, change:

```ts
    .select(
      `id, name_en, name_so, brand,
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
```

to:

```ts
    .select(
      `id, name_en, name_so, brand,
       category:categories(name_en),
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
```

In `src/app/api/ai/search/route.ts`, change:

```ts
    .select(
      `id, name_en, name_so, brand,
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
```

to:

```ts
    .select(
      `id, name_en, name_so, brand,
       category:categories(name_en),
       product_images(image_url, thumbnail_url, sort_order),
       product_variants(price_slsh, is_active, inventory(quantity_on_hand, quantity_reserved, threshold, location_id))`
    )
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/api/__tests__/products.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all test files pass, including the pre-existing `src/app/api/__tests__/ai-search.test.ts` (its mock product rows don't include `category`, which is fine — `categoryNameEn` just comes through as `null`/`undefined` there, and none of its assertions check that field).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/products/route.ts src/app/api/products/featured/route.ts src/app/api/ai/search/route.ts src/app/api/__tests__/products.test.ts
git commit -m "feat: select and pass through category name in product API routes"
```

---

### Task 7: Generate and seed the 3 launch banners

**Files:**
- Create: `src/scripts/generate-brand-banners.ts`

**Interfaces:**
- Consumes: `@playwright/test`'s `chromium` launcher (already a dev dependency, browser already installed per this session's earlier E2E verification work), `sharp` (already a dependency, same usage pattern as `src/app/api/admin/upload/route.ts`), `@supabase/supabase-js` `createClient` (same direct-usage pattern as `src/scripts/batch-embed.ts`).
- Produces: 3 WebP files in the `banners` Storage bucket and 3 rows in the `banners` table. This is a one-time manual script (`npx tsx src/scripts/generate-brand-banners.ts`), not part of the application's runtime — matches `src/scripts/batch-embed.ts`'s existing precedent exactly, including its `.env.local`-loading approach (Next.js's own env loading isn't available to a bare script).

This task is not TDD in the traditional sense (it's a one-shot script against real infrastructure, same as `batch-embed.ts`) — verification is Step 4 (query the DB directly) and Task 8 (see it render in a real browser).

- [ ] **Step 1: Write the script**

Create `src/scripts/generate-brand-banners.ts`:

```ts
/**
 * One-time script: renders the 3 approved brand-refresh banners to WebP
 * images via a headless browser, uploads them to the `banners` Storage
 * bucket, and inserts the 3 `banners` rows. Run with:
 *   npx tsx src/scripts/generate-brand-banners.ts
 *
 * Copy is verbatim from Docs/superpowers/specs/2026-07-15-somaliland-brand-refresh-design.md
 * — do not edit the Somali text here without going back to that spec.
 *
 * Talks to Supabase directly (not via HTTP to an API route) for the same
 * reason src/scripts/batch-embed.ts does: a CLI script has no browser
 * session to authenticate an admin request with.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = join(__dirname, '..', '..', '.env.local')
  const text = readFileSync(envPath, 'utf-8')
  const values: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) values[m[1]] = m[2].trim().replace(/^"|"$/g, '')
  }
  return values
}

const WIDTH = 1600
const HEIGHT = 686 // matches BannerCarousel's aspect-[21/9]

interface BannerSpec {
  filename: string
  titleEn: string
  titleSo: string
  ctaTextEn: string | null
  ctaTextSo: string | null
  ctaUrl: string | null
  sortOrder: number
  html: string
}

const CALCULATOR_ICON = `
  <svg width="220" height="220" viewBox="0 0 70 70" style="position:absolute;right:60px;top:50%;transform:translateY(-50%);opacity:0.25">
    <rect x="15" y="10" width="40" height="50" rx="4" fill="none" stroke="#1c1917" stroke-width="3"/>
    <line x1="22" y1="22" x2="48" y2="22" stroke="#1c1917" stroke-width="3"/>
    <circle cx="26" cy="34" r="3" fill="#1c1917"/>
    <circle cx="35" cy="34" r="3" fill="#1c1917"/>
    <circle cx="44" cy="34" r="3" fill="#1c1917"/>
    <circle cx="26" cy="44" r="3" fill="#1c1917"/>
    <circle cx="35" cy="44" r="3" fill="#1c1917"/>
    <circle cx="44" cy="44" r="3" fill="#1c1917"/>
  </svg>`

const STAR_ICON = `
  <svg width="220" height="220" viewBox="0 0 70 70" style="position:absolute;right:60px;top:50%;transform:translateY(-50%);opacity:0.3">
    <path d="M35 8 L42 26 L61 26 L46 38 L52 57 L35 45 L18 57 L24 38 L9 26 L28 26 Z" fill="white"/>
  </svg>`

function bannerHtml(opts: {
  gradient: string
  headline: string
  subtitle: string
  headlineColor: string
  subtitleColor: string
  icon?: string
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; }
</style></head>
<body>
  <div style="position:relative;width:${WIDTH}px;height:${HEIGHT}px;background:${opts.gradient};display:flex;align-items:center;padding:0 100px;overflow:hidden">
    ${opts.icon ?? ''}
    <div style="max-width:950px;position:relative">
      <div style="font-size:56px;font-weight:700;line-height:1.3;color:${opts.headlineColor}">${opts.headline}</div>
      <div style="font-size:24px;opacity:0.8;margin-top:12px;color:${opts.subtitleColor}">${opts.subtitle}</div>
    </div>
  </div>
</body></html>`
}

const BANNERS: BannerSpec[] = [
  {
    filename: 'welcome.webp',
    titleEn: 'Your one-stop shop for every build.',
    titleSo: 'Wax kasta oo aad ugu baahan tahay dhisme kasta — hal meel.',
    ctaTextEn: null,
    ctaTextSo: null,
    ctaUrl: null,
    sortOrder: 1,
    html: bannerHtml({
      gradient: 'linear-gradient(120deg, #FDF6EC, #0D9488)',
      headline: 'Wax kasta oo aad ugu baahan tahay dhisme kasta — hal meel.',
      subtitle: 'Your one-stop shop for every build.',
      headlineColor: '#1c1917',
      subtitleColor: '#0f4c44',
    }),
  },
  {
    filename: 'ai-estimator.webp',
    titleEn: 'Fast, Accurate & Reliable Project Estimates',
    titleSo: 'Qiyaasta Mashruuca oo Deddeg ah, Sax ah, oo La Aamini Karo.',
    ctaTextEn: 'Get an estimate',
    ctaTextSo: 'Hel Qiimeyn',
    ctaUrl: '/ai/estimate',
    sortOrder: 2,
    html: bannerHtml({
      gradient: 'linear-gradient(120deg, #FDF6EC, #F97316)',
      headline: 'Qiyaasta Mashruuca oo Deddeg ah, Sax ah, oo La Aamini Karo.',
      subtitle: 'Fast, Accurate & Reliable Project Estimates',
      headlineColor: '#1c1917',
      subtitleColor: '#7c2d12',
      icon: CALCULATOR_ICON,
    }),
  },
  {
    filename: 'loyalty.webp',
    titleEn: 'Loyalty Pays Off!',
    titleSo: 'Aaminaad = Abaalmarin!',
    ctaTextEn: 'View my points',
    ctaTextSo: 'Eeg Dhibcahayga Abaalmarinta',
    ctaUrl: '/loyalty',
    sortOrder: 3,
    html: bannerHtml({
      gradient: 'linear-gradient(120deg, #0D9488, #F97316)',
      headline: 'Aaminaad = Abaalmarin!',
      subtitle: 'Loyalty Pays Off!',
      headlineColor: '#ffffff',
      subtitleColor: '#ffffff',
      icon: STAR_ICON,
    }),
  },
]

async function main() {
  const env = loadEnvLocal()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

  const activeFrom = new Date()
  const activeUntil = new Date(activeFrom)
  activeUntil.setFullYear(activeUntil.getFullYear() + 2)

  for (const banner of BANNERS) {
    await page.setContent(banner.html)
    const pngBuffer = await page.screenshot({ type: 'png' })
    const webpBuffer = await sharp(pngBuffer).webp({ quality: 80 }).toBuffer()

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(banner.filename, webpBuffer, { contentType: 'image/webp', upsert: true })
    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(banner.filename)

    const { error: insertError } = await supabase.from('banners').insert({
      title_en: banner.titleEn,
      title_so: banner.titleSo,
      image_url: urlData.publicUrl,
      cta_text_en: banner.ctaTextEn,
      cta_text_so: banner.ctaTextSo,
      cta_url: banner.ctaUrl,
      scope_type: 'all',
      active_from: activeFrom.toISOString(),
      active_until: activeUntil.toISOString(),
      sort_order: banner.sortOrder,
      is_active: true,
    })
    if (insertError) throw insertError

    console.log(`✓ ${banner.filename} uploaded and seeded (sort_order ${banner.sortOrder})`)
  }

  await browser.close()
  console.log(`Done. Seeded ${BANNERS.length} banners.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the script against the dev Supabase project**

Run: `npx tsx src/scripts/generate-brand-banners.ts`
Expected output:
```
✓ welcome.webp uploaded and seeded (sort_order 1)
✓ ai-estimator.webp uploaded and seeded (sort_order 2)
✓ loyalty.webp uploaded and seeded (sort_order 3)
Done. Seeded 3 banners.
```

- [ ] **Step 3: Verify via direct SQL query**

Using the Supabase MCP `execute_sql` tool (or the SQL editor) against the dev project:

```sql
SELECT title_en, image_url, cta_text_en, sort_order, is_active FROM banners ORDER BY sort_order;
```

Expected: 3 rows, `title_en` values `'Your one-stop shop for every build.'`, `'Fast, Accurate & Reliable Project Estimates'`, `'Loyalty Pays Off!'` in that order, each `image_url` pointing at Supabase Storage's public `banners` bucket URL, `is_active = true`.

- [ ] **Step 4: Commit the script (not the generated images — those live in Supabase Storage, not the repo)**

```bash
git add src/scripts/generate-brand-banners.ts
git commit -m "feat: add script to generate and seed the 3 brand-refresh banners"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Run the full automated checkpoint**

```bash
npx tsc --noEmit
npx eslint src/
npx prettier --check src/
npx vitest run
```

Expected: all four exit with code 0 / no errors, matching this project's established Phase 13 bar.

- [ ] **Step 2: Visually verify in a real browser (not curl)**

Reuse the Playwright-screenshot technique already used for verifying the category-not-found fix earlier in this project (do not rely on `curl` — the banner carousel and product-card fallback are both client-rendered / image-based, so a raw HTTP fetch can't meaningfully validate them):

1. Build and start the app: `npx next build && npx next start -p 3010`
2. Using a short throwaway Playwright script (same pattern as the earlier verification scripts in this session — launch chromium, `page.goto('http://localhost:3010')`, screenshot), confirm:
   - The homepage banner carousel shows the Welcome banner on load, and rotates to the AI Estimator and Loyalty banners after the autoplay interval.
   - A product with no uploaded photo (any of the current seed products using `placehold.co` thumbnail URLs are unaffected by this plan — they still show their placehold.co image, since that's a real, non-null `thumbnailUrl`; to see the new fallback, temporarily null out one seed product's `thumbnail_url` via SQL, reload, confirm the category-appropriate icon renders in a teal circle, then restore the original value) shows the correct `CategoryIcon`.
   - A category card with no `icon_url` (all 5 seed categories currently have `icon_url = null` per the earlier `/api/categories` check) shows its category-specific icon instead of the old generic grid icon.
3. Stop the server and delete the throwaway verification script (same cleanup discipline as earlier in this session — don't leave scratch scripts in the repo).

- [ ] **Step 3: Update the design spec's status line**

In `Docs/superpowers/specs/2026-07-15-somaliland-brand-refresh-design.md`, change:

```markdown
**Status:** Approved, ready for implementation plan
```

to:

```markdown
**Status:** Implemented
```

- [ ] **Step 4: Commit**

```bash
git add "Docs/superpowers/specs/2026-07-15-somaliland-brand-refresh-design.md"
git commit -m "docs: mark Somaliland brand refresh spec as implemented"
```
