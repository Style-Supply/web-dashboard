# Task 8 of 9 — Dashboard Preview Pane

You are picking up **task 8 of 9**. No prior context. Everything is in this file and §2.

**Dependencies:** Task 5 (scaffold) must have passed tier-1. Can run in parallel with tasks 6 and 7. Task 6 will leave a placeholder slot in `/products/new/page.tsx` for you to replace with the real `PreviewPane`.

---

## 0. What you are building

A live preview pane that mirrors the storefront PDP (product detail page). You **copy** the hero component and care section from `web-frontend/` into `web-dashboard/src/components/preview/`, convert the copied hero to take props instead of reading hardcoded data, and wrap them in a `PreviewPane` that binds to the form state from task 6.

You also write a small `adapter.ts` that converts `ProductPayload + ProductImage[]` into the props the copied hero expects.

## 1. Working directory

Primary: `/Users/harsh/Desktop/style_supply/web-dashboard/`

## 2. Reference documents (read, don't modify)

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — **§8** (preview behavior, what's mirrored, what's simplified).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — "Task 8".
3. **Frontend source (READ-ONLY):**
   - `/Users/harsh/Desktop/style_supply/web-frontend/src/app/product/[id]/page.tsx` — find the `ProductHero` function (roughly lines 68–247). You copy its JSX + local state into `ProductHeroPreview.tsx` and convert hardcoded constants to props.
   - `/Users/harsh/Desktop/style_supply/web-frontend/src/components/sections/CareSection.tsx` — copy verbatim.
4. **Task 5 output:** `src/types/product.ts`, `src/lib/price.ts`.
5. **Task 6 output:** `src/hooks/useProductFormState.ts`, `src/app/products/new/page.tsx` — you edit this page to replace the placeholder with real `PreviewPane`.

## 3. First action: write this task file if missing

Path: `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/08-dashboard-preview.md`.

## 4. Files you will create or modify

### Create
1. `src/components/preview/ProductHeroPreview.tsx` — copied from frontend `ProductHero` + converted to props
2. `src/components/preview/CareSection.tsx` — verbatim copy of frontend
3. `src/components/preview/PreviewPane.tsx` — wraps the two above
4. `src/components/preview/adapter.ts` — `formStateToPreviewProduct` pure function

### Modify
5. `src/app/products/new/page.tsx` — replace task 6's `PreviewPlaceholder` import + render with real `PreviewPane` wired to `useProductFormState` state

**DO NOT:**
- Modify ANY file in `web-frontend/`. It is read-only reference.
- Touch `ProductForm.tsx` or any other task-6 file beyond `products/new/page.tsx` (and in that file, only the preview slot).
- Create files in `src/app/products/[id]/` — task 9 owns those.
- Touch `web-backend/`.
- Modify the hero's storefront file once you've copied it.

## 5. Conventions

- `'use client'` on every preview component — they use local state (size selector, image carousel).
- Copy-paste, don't refactor. The point is **visual fidelity** with the storefront. If the frontend uses a weird pattern, keep it weird.
- Convert hardcoded constants (product name, brand, prices, image URLs, sizes) into props. Defaults should render a believable empty state (placeholder title, ₹0, single grey image).
- Image source precedence: prefer `public_url`, fall back to `source_url`, fall back to a neutral placeholder (`data:image/svg+xml;...` 1px grey).
- `SIZE_OPTIONS`: derive the distinct set of sizes from `state.variants`, sorted in canonical order `['XS','S','M','L','XL','XXL','Free']`. `UNAVAILABLE_SIZES`: sizes with total `quantity === 0` across all their variants.
- No framer-motion, no GSAP, no animation library — if the frontend uses one, **keep it** (copy imports, let them install). But do not add new dependencies beyond what the frontend already uses and what task 5 installed.

**Dependency note:** if the copied hero imports from packages not in task 5's `package.json`, add them to `package.json` matching the frontend's versions. Report all such additions in your completion report.

## 6. Contract

### `formStateToPreviewProduct`

```ts
import type { ProductPayload, ProductImage } from '@/types/product';

export interface PreviewProductProps {
  title: string;
  brand: string;
  originalPrice: number;   // rupees, not paise
  currentPrice: number;    // rupees
  description: string;
  images: { url: string; alt: string }[];
  sizeOptions: string[];
  unavailableSizes: string[];
}

export function formStateToPreviewProduct(
  state: ProductPayload,
  images: ProductImage[]
): PreviewProductProps;
```

Empty-state defaults:
- `title`: state.name || "Untitled product"
- `brand`: state.brand || "—"
- `originalPrice`: `fromMinor(state.retail_price_minor || 0)`
- `currentPrice`: `fromMinor(state.rent_price_minor ?? state.retail_price_minor ?? 0)`
- `description`: state.description || ""
- `images`: ordered by `sort_order`, mapped to `{ url: public_url || source_url || placeholder, alt: alt || state.name }`. If empty, return one placeholder entry.
- `sizeOptions`: see §5.
- `unavailableSizes`: see §5.

### `PreviewPane` props

```ts
interface PreviewPaneProps { state: ProductPayload; images: ProductImage[]; }
```

Renders `<div className="bg-white max-w-[1440px] mx-auto">` containing `<ProductHeroPreview {...formStateToPreviewProduct(state, images)} />` and `<CareSection />`.

## 7. Step-by-step

1. Read the frontend `ProductHero` function fully. Note every imported dependency, every hardcoded string, every local `useState`.
2. Copy into `ProductHeroPreview.tsx`. Replace hardcoded constants with destructured props per the `PreviewProductProps` interface. Preserve layout classes exactly.
3. Copy `CareSection.tsx` verbatim into `src/components/preview/`. Fix import paths only (if it imports from `@/...` it likely still resolves because task 5 set up the same alias — verify).
4. Write `adapter.ts`.
5. Write `PreviewPane.tsx`.
6. Edit `src/app/products/new/page.tsx`: remove `PreviewPlaceholder` import + usage, replace with `PreviewPane` wired to `state` from `useProductFormState`. Task 6 owns that file — touch only the preview slot. If task 6 used a different placeholder name, still only swap the preview slot, nothing else.
7. If you added dependencies, run `npm install` before the tier-1 gate.
8. Run tier-1 gate.

## 8. Do NOT

- ❌ `git commit` / `git push`.
- ❌ Modify `web-frontend/` in any way.
- ❌ Add routes or any file under `src/app/products/[id]/`, `batch/`, or `page.tsx` at products root.
- ❌ Refactor the copied hero's internal structure. Convert hardcoded values to props — nothing else.
- ❌ Touch `web-backend/`.
- ❌ Use `any`.
- ❌ `npm run dev`.

## 9. Tier-1 gate (MANDATORY)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard
npm install   # only if you added dependencies
npx tsc --noEmit
npm run lint
npm run build
```
Then:
```bash
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/components/preview/ProductHeroPreview.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/components/preview/CareSection.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/components/preview/PreviewPane.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/components/preview/adapter.ts
grep -n 'PreviewPane' /Users/harsh/Desktop/style_supply/web-dashboard/src/app/products/new/page.tsx
```

## 10. Tier-2 verification (DEFERRED)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard && npm run dev
# /products/new:
# Type into name/price/description → right pane updates live
# Add variant with size M → size pill M becomes available
# Paste image URL into importer (task 7) → hero image updates on next blur
```

## 11. Completion report format

```
## Task 8 — Dashboard Preview Pane — COMPLETE

### Files created
<list 4>

### Files modified
- src/app/products/new/page.tsx (preview slot only)

### Dependencies added (if any)
<list each with version and why, or "None.">

### Tier-1 gate output
<tsc + lint + build>

### Tier-2 steps (deferred)
<copy §10>

### Deviations
<list or "None.">

### Blockers for task 9
<list or "None.">
```
