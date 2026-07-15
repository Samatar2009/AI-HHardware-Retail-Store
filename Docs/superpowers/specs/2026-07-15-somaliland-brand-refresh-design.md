# Somaliland Brand Refresh — Design Spec

**Date:** 2026-07-15
**Status:** Approved, ready for implementation plan

## Goal

Give Borama Hardware a distinct visual identity: the warm, neighborly "local hardware store" feel associated with Home Hardware (the Canadian chain), reinterpreted through Somaliland trade culture rather than copied outright, applied to three concrete surfaces — the design token palette, product/category placeholder imagery, and the homepage banner carousel.

## Trademark boundary (non-negotiable)

Nothing in this spec reproduces Home Hardware's actual logo, wordmark, red/white color scheme, or any other protected brand asset. "Home Hardware inspiration" means the *tone* — approachable, community-focused, confident two-tone color use, clean product-grid merchandising — not the *identity*. This distinction matters because the app will be shown to real prospective business customers; anything that reads as impersonating or being affiliated with Home Hardware would be a real legal problem for the user, not just a design nitpick.

## Decisions made during brainstorming

Captured here because they were reached through a back-and-forth (multiple options presented, one chosen) rather than being obvious defaults — future readers should not assume a different color/copy choice was overlooked.

- **Scope:** full visual identity refresh (color tokens), not just the two originally-flagged polish items (placeholder images, empty banners).
- **What carries over from Home Hardware:** specifically the "warm, neighborly local store" tone — not the red/white palette, not a specific logo treatment, not the grid-merchandising layout (those options were offered but not selected).
- **Somali cultural anchor:** Somaliland place/trade imagery (frankincense, coastal/caravan trade routes) — explicitly *not* flag colors, not textile/geometric patterns, not Somali-language-weighting as a separate axis. Chosen over three other options in a multi-select question where only this one was picked.
- **Color palette — "Frankincense & Coast" (option A of three presented):** keeps the existing orange primary (already load-bearing across ~100 components) and adds two new tokens rather than replacing anything. Rejected alternatives: "Sunset Trade Route" (terracotta/indigo, bigger departure) and "Coastal Souq" (teal-led, would require re-deriving the entire existing token set) — rejected specifically because of the re-derivation/re-testing cost across the whole app.
- **Product placeholder strategy:** custom SVG category-icon illustrations, explicitly chosen over generic stock photography. Reasoning that was agreed: stock photos risk a customer believing a photo *is* the specific product they're ordering; hand-built category icons are honestly a placeholder and can't misrepresent a SKU.
- **Banner treatment — "Sand & Sea Gradient" (option B of three presented):** soft sand-to-teal gradient, no illustrated scene, Somali-first headline with English subtitle underneath. Rejected alternatives: "Bold Caravan" (solid orange with a dhow-sail silhouette) and "Split Panel" (two-tone teal/orange block with an icon) — B was chosen directly, not derived from a stated reason, so don't over-interpret the rejection of A/C beyond "user preferred B."
- **All Somali banner copy was supplied verbatim by the user** — not translated or invented by Claude. This was a hard correction mid-session (an invented Somali headline was wrong) and the process afterward was: ask for exact text, use it verbatim, only ask about *typography* choices (e.g., hyphen vs. em dash) rather than *wording* choices.
- **Banner count:** 3 (Welcome, AI Project Estimator, Loyalty), not 1. User explicitly opted into the larger set knowing it meant supplying two more pieces of Somali copy.

## 1. Design tokens

Add two new CSS custom properties to `src/app/globals.css` (`@layer base` `:root` block, alongside the existing `--color-primary` / `--color-primary-dark` from Guidelines doc Section 2), and mirror them in `tailwind.config.ts`'s theme extension so they're usable as Tailwind utility classes (e.g. `bg-secondary`, `text-secondary`):

| Token | Hex | Role |
|---|---|---|
| `--color-primary` | `#F97316` | **Unchanged.** Existing orange, still primary brand color. |
| `--color-secondary` | `#0D9488` | **New.** Teal — Gulf of Aden. Used for secondary accents, the loyalty banner gradient, category icon accents. |
| `--color-sand` | `#FDF6EC` | **New.** Warm neutral background — used in banner gradients and as an alternative to `stone-50` where warmth is wanted. |

No existing component changes color as a result of this step. This is purely additive — the two new tokens exist and are available, but nothing is migrated to use them as part of this spec (that happens in steps 2–3 below, which are the only consumers).

## 2. Category icon illustrations

New component: `src/components/category-icon.tsx`. Exports a `CategoryIcon` component that takes a category identifier (name or a stable slug — implementation plan should decide which, matching however categories are already keyed elsewhere in the codebase) and renders one of 5 hand-built inline SVGs:

- Power Tools
- Hand Tools
- Building Materials
- Plumbing
- Electrical

Style: simple flat line-art, two-color (primary orange + secondary teal), no photorealism, no people, no culturally-specific iconography beyond the category subject itself (a drill, a wrench, a stack of bricks, a pipe fitting, a lightning bolt/conduit — literal tool/material icons, not an attempt at cultural imagery here; the *trade imagery* concept lives in the banners, not the category icons).

Consumers (replace the current `placehold.co` fallback):
- `src/components/product-card.tsx` — when a product has no `product_images` row.
- `src/components/product-grid.tsx` — same fallback path.
- `src/components/category-card.tsx` — when a category has no `icon_url`.

If a category doesn't match one of the 5 known icons (future categories the store adds later), fall back to a generic neutral "package" icon rather than erroring — this only has 5 categories today but the schema allows arbitrary future ones.

## 3. Three launch banners

### Copy (verbatim, user-supplied)

| # | Somali headline | English subtitle | Topic |
|---|---|---|---|
| 1 | Wax kasta oo aad ugu baahan tahay dhisme kasta — hal meel. *(em dash, per user confirmation)* | Your one-stop shop for every build. | Welcome |
| 2 | Qiyaasta Mashruuca oo Deddeg ah, Sax ah, oo La Aamini Karo. *(double comma corrected to single, per user confirmation)* | Fast, Accurate & Reliable Project Estimates | AI Project Estimator |
| 3 | Aaminaad = Abaalmarin! | Loyalty Pays Off! | Loyalty program |

### Visual treatment

All three share the Sand & Sea Gradient family (soft diagonal gradient, Somali headline bold and large, English subtitle smaller and muted below it, no illustrated scene) with a per-topic accent so they're distinguishable while rotating:

1. **Welcome:** sand (`#FDF6EC`) → teal (`#0D9488`) gradient, no icon.
2. **AI Estimator:** sand → orange (`#F97316`) gradient, small low-opacity calculator/grid icon.
3. **Loyalty:** teal → orange gradient, small low-opacity star icon, white text (needs the darker gradient for contrast).

Exact mockups were approved live in the brainstorming session's visual companion (`.superpowers/brainstorm/1456-1784146916/content/banners-all-three.html` — kept locally, not committed, per the skill's own gitignore guidance) and should be reproduced pixel-for-pixel by whatever generates the final assets.

### Technical implementation

The `banners` table requires `image_url` (`NOT NULL`) and `BannerCarousel` (`src/components/banner-carousel.tsx`) only renders `<img>` — there is no live gradient/text rendering mode, and building one would mean changing the schema, the admin banner-creation UI, and the carousel component just to support a "type" of banner an admin still couldn't recreate by hand through the existing "upload an image" flow. Rather than take on that scope, generate real image assets and feed them through the *existing* pipeline:

1. Render each banner's HTML/CSS at the carousel's actual runtime aspect ratio (`aspect-[21/9]`, e.g. 1600×686px) using a headless browser (Playwright, already a project dependency).
2. Convert to WebP via `sharp` (already used identically in `src/app/api/admin/upload/route.ts` for product images) — keeps output format consistent with what real admin uploads produce.
3. Upload the three WebP files to the `banners` Storage bucket using the service-role client (same auth pattern as other admin-only server-side operations in this codebase).
4. Insert 3 rows into `banners`: `title_en`/`title_so` (used for the `alt` text and admin list — not rendered as overlay text, since the text is baked into the image itself), `image_url` pointing at the uploaded asset, `scope_type='all'`, `active_from`/`active_until` spanning a wide window (e.g. now through +2 years, since these aren't time-limited promotions), `sort_order` 1/2/3, `is_active=true`. CTA fields, explicitly:
   - Banner 1 (Welcome): `cta_text_en`/`cta_text_so` and `cta_url` left `null` — it's a brand-welcome banner, not a directed action.
   - Banner 2 (AI Estimator): `cta_url='/ai/estimate'`, `cta_text_en='Get an estimate'`, `cta_text_so='Hel Qiimeyn'` *(user-supplied verbatim)*.
   - Banner 3 (Loyalty): `cta_url='/loyalty'`, `cta_text_en='View my points'`, `cta_text_so='Eeg Dhibcahayga Abaalmarinta'` *(user-supplied verbatim)*.

This is a one-time seed operation, not a migration — it can be a throwaway Node script run once against the dev Supabase project, not part of the application's runtime code.

## Out of scope (explicitly deferred, not overlooked)

- **Logo/wordmark redesign** — not discussed; "simple sturdy wordmark" was an available option in the Home Hardware inspiration question and was not selected.
- **Typography changes** — no font decisions were made; this spec only touches color and imagery.
- **Layout changes** — grid structure, spacing, and component composition are unchanged; only colors, icons, and banner images are added.
- **Somali translations beyond the 3 banners** — `messages/so.json` is unmodified. If more Somali marketing copy is wanted later, it must come from the user (or a vetted translator) the same way this session's banner copy did — Claude should not invent Somali text.
- **Real product photography** — still an operational task for the business, not something this spec attempts to solve. The category icons are an honest placeholder, not a replacement for real photos.
- **Migrating existing components to the new teal/sand tokens** — the tokens are added and consumed only by the two features in this spec (category icons, banners). A broader sweep to use teal as a secondary-button color, status-badge variant, etc. is a separate future decision, not bundled in here.

## Verification

- `tsc --noEmit`, `eslint`, `prettier --check`, `vitest run` must all stay green (matches the existing Phase 13 checkpoint bar already established in this project).
- Visually confirm in a real browser (not just curl) that: the 3 banners render and rotate correctly, category icons appear wherever a product/category lacks a real photo, and no existing component's orange styling regressed.
- Reuse the Playwright-screenshot verification technique already used earlier in this session (see the category-not-found fix) rather than relying on `curl`, since these are client-rendered / image-based changes that a raw HTTP fetch can't meaningfully validate.
