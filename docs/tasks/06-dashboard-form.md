# Task 6 of 9 — Dashboard Product Form + Variant Editor + Autocomplete

You are picking up **task 6 of 9**. No prior context. Everything you need is in this file and §2.

**Dependencies:** Task 5 (dashboard scaffold) must have passed its tier-1 gate.

---

## 0. What you are building

The `/products/new` page: a split-pane layout with a product form on the left and a **placeholder** preview pane on the right. The form is composed of `BasicFieldsBlock`, `PricingBlock`, `VariantEditor`, and an `AutocompleteInput` used by brand / category / collection / fabric fields. The real `PreviewPane` comes from task 8 — you leave a placeholder and task 8 wires itself in.

You also create an `ImageImporter` **stub file** (one-line placeholder component) so task 6's form compiles. Task 7 replaces its body.

## 1. Working directory

Primary: `/Users/harsh/Desktop/style_supply/web-dashboard/`

## 2. Reference documents

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — **§4** (data shapes), **§9** (form layout, variant UX, autocomplete behavior, save flow).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — "Task 6" section.
3. **Task 5 output:** `/Users/harsh/Desktop/style_supply/web-dashboard/src/` — read `types/product.ts`, `lib/api.ts`, `lib/price.ts`, `components/ui/*`. You import from these.
4. **Task 1 template:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/01-backend-foundation.md` — for the general discipline of strict TS and no unnecessary abstractions.

## 3. First action: write this task file if missing

Path: `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/06-dashboard-form.md`.

## 4. Files you will create or modify

### Create
1. `src/app/products/new/page.tsx`
2. `src/components/product-form/ProductForm.tsx`
3. `src/components/product-form/BasicFieldsBlock.tsx`
4. `src/components/product-form/PricingBlock.tsx`
5. `src/components/product-form/VariantEditor.tsx`
6. `src/components/product-form/AutocompleteInput.tsx`
7. `src/components/product-form/ImageImporter.tsx` — **stub only**: `'use client'; export default function ImageImporter() { return <div className="text-sm text-neutral-500">Image importer — task 7</div>; }`
8. `src/hooks/useProductFormState.ts`
9. `src/hooks/useAutocomplete.ts`

### Modify
10. `src/lib/api.ts` — flesh out `saveProduct`, `updateProduct`, `getProduct`, `deleteProduct`, `getSuggestions` (they may already exist as typed stubs from task 5 — replace their bodies with real `request(...)` calls).

**DO NOT:**
- Modify `src/components/ui/*` (from task 5).
- Touch `src/components/preview/*` (task 8) or create those files.
- Touch `src/app/products/page.tsx`, `src/app/products/[id]/*`, `src/app/products/batch/*` — task 9 owns all of those.
- Modify `src/types/product.ts` — task 5 owns it.
- Touch `web-backend/` or `web-frontend/`.

## 5. Conventions

- `'use client'` at the top of every component that uses hooks or event handlers. Server components only for the page shell if it has no interactivity.
- Form state is a **single object** shaped like `ProductPayload` from `@/types/product`. Managed by `useProductFormState()` which returns `{ state, set, setField, addVariant, removeVariant, updateVariant }`.
- Controlled inputs. No `react-hook-form`, no form libraries.
- Debounce autocomplete at **250ms**. Use `setTimeout` + cleanup, no `lodash`.
- Prices in the UI are rupees (floats); convert to minor with `toMinor` only at save time.
- Validation is best-effort client-side (name non-empty, retail price ≥ 0, at least one variant with size) — server is authoritative.

## 6. Contract

### `/products/new` page layout

Split pane (CSS grid, 2 columns, `lg:grid-cols-[1fr_480px]`). Left: form scroll container. Right: sticky preview pane placeholder at `h-full overflow-auto` — render `<PreviewPane state={state} />` if task 8 has landed, otherwise render `<div className="text-sm text-neutral-500">Preview — task 8</div>`. Use dynamic import with a try/catch fallback OR conditional import:
```tsx
// Attempt to import the real preview; falls back to placeholder if task 8 has not landed.
import PreviewPane from '@/components/preview/PreviewPane';
```
If the import fails your build will fail — so instead, create a local `src/components/product-form/PreviewPlaceholder.tsx` that just renders the placeholder text, and use it directly. Task 8 will replace the import in `products/new/page.tsx` with the real `PreviewPane`. **Use the placeholder component — do not attempt the conditional import.**

Bottom action bar: "Save draft" and "Save & publish" buttons. Both call `saveProduct(payload)` — the second sets `status: 'published'` before saving. On success, `router.push(\`/products/\${id}\`)`.

### `VariantEditor`

Rows of `<select size>` + `<AutocompleteInput field="colour">` + `<input quantity>` + `<AutocompleteInput field="location">` + delete button. "Add variant" button at the bottom. On add, scroll the new row into view. Duplicate detection: if a new (size, colour, location) tuple matches an existing row, highlight the row in red and block save. Sizes come from a hardcoded list `['XS','S','M','L','XL','XXL','Free']`.

### `AutocompleteInput`

Props: `{ field: 'brand'|'category'|'collection'|'fabric'|'colour'|'location', value: string, onChange: (v: string) => void, placeholder?: string }`. Internally calls `useAutocomplete(field, value)` which debounces and fetches `GET /api/admin/suggestions?field=...&q=...`. Dropdown shows up to 10 suggestions. Arrow keys navigate, Enter commits, Esc closes. Commit on blur after a 150ms delay to let clicks land.

### `useAutocomplete`

```ts
export function useAutocomplete(field: SuggestionField, query: string): { suggestions: string[]; loading: boolean };
```
250ms debounce. Aborts the previous fetch (`AbortController`) on new query.

### `useProductFormState`

```ts
export function useProductFormState(initial?: Partial<ProductPayload>): {
  state: ProductPayload;
  set: (next: ProductPayload) => void;
  setField: <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => void;
  addVariant: () => void;
  removeVariant: (index: number) => void;
  updateVariant: (index: number, patch: Partial<ProductVariant>) => void;
};
```
Initial default: empty strings / zero / one empty variant row `{ size: '', colour: null, quantity: 0, location: null }`.

## 7. Step-by-step

1. Read task 5's `api.ts`, `types/product.ts`, `ui/*`. Confirm `request`, `API_BASE` exported.
2. Flesh out `api.ts` functions listed in §4. Real `POST /api/admin/products`, `PATCH /:id`, `GET /:id`, `DELETE /:id`, `GET /suggestions`.
3. Create hooks.
4. Create form components. `ImageImporter.tsx` stub first.
5. Create `/products/new/page.tsx`. Wire `useProductFormState` and render `<ProductForm />` + placeholder preview.
6. Run tier-1 gate.

## 8. Do NOT

- ❌ `git commit` / `git push`.
- ❌ Add dependencies (no `react-hook-form`, no `zod`, no `date-fns`, no icon library).
- ❌ Touch task 8 or task 9 files.
- ❌ Write real image importer logic (task 7).
- ❌ Mutate `state` directly — always go through `useProductFormState`.
- ❌ Call `fetch` directly — go through `request` from `api.ts`.
- ❌ Use `any`.
- ❌ `npm run dev`.

## 9. Tier-1 gate (MANDATORY)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard
npx tsc --noEmit
npm run lint
npm run build
```
All three must pass. Then:
```bash
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/app/products/new/page.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/components/product-form/ProductForm.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/hooks/useProductFormState.ts
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/components/product-form/ImageImporter.tsx
```

## 10. Tier-2 verification (DEFERRED)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard && npm run dev
# Visit /products/new
# Type in Brand → dropdown of suggestions appears (real backend call)
# Add variants, try a duplicate → highlighted red, save blocked
# Save draft → POST to backend, redirect to /products/:id
```

## 11. Completion report format

```
## Task 6 — Dashboard Product Form — COMPLETE

### Files created
<list 9>

### Files modified
- src/lib/api.ts

### Tier-1 gate output
<tsc + lint + build>

### Tier-2 steps (deferred)
<copy §10>

### Deviations
<list or "None.">

### Blockers for task 7 / task 8 / task 9
<list or "None.">
```
