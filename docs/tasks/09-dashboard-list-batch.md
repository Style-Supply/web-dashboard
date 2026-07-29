# Task 9 of 9 — Dashboard List + Edit + Batch + Standalone Preview

You are picking up **task 9 of 9** — the final integration task. No prior context. Everything is in this file and §2.

**Dependencies:** Tasks 5, 6, 7, 8 must have passed tier-1. You compose all of them into four new routes: product list, single edit, standalone preview, CSV batch upload.

---

## 0. What you are building

Four new pages + supporting components:

- `/products` — list view with filters, sort, bulk-action bar
- `/products/[id]` — edit view; reuses `ProductForm` (task 6) preloaded via `getProduct(id)` and the real `PreviewPane` (task 8)
- `/products/[id]/preview` — standalone full-width PDP preview (no form)
- `/products/batch` — CSV upload + preview + import

Plus: a `public/dashboard-template.csv` worked example and extensions to `src/lib/api.ts` for list/bulk/batch.

## 1. Working directory

Primary: `/Users/harsh/Desktop/style_supply/web-dashboard/`

## 2. Reference documents

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — **§10** (batch flow — CSV template, row grouping, validation UX, results), **§11** (list view — columns, filters, sort, bulk actions), **§5.5** (batch route contract, already implemented by task 4).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — "Task 9".
3. **Task 1 template:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/01-backend-foundation.md` — general discipline.
4. **Task 5/6/7/8 output** — all of `web-dashboard/src/`. You import from:
   - `src/types/product.ts`
   - `src/lib/api.ts`, `src/lib/price.ts`
   - `src/components/product-form/ProductForm.tsx`, `useProductFormState`
   - `src/components/preview/PreviewPane.tsx`
   - `src/components/ui/*`

## 3. First action: write this task file if missing

Path: `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/09-dashboard-list-batch.md`.

## 4. Files you will create or modify

### Create — pages
1. `src/app/products/page.tsx` — list view
2. `src/app/products/[id]/page.tsx` — edit view
3. `src/app/products/[id]/preview/page.tsx` — standalone preview
4. `src/app/products/batch/page.tsx` — CSV flow

### Create — list components
5. `src/components/list/ProductTable.tsx`
6. `src/components/list/ProductFilters.tsx`
7. `src/components/list/BulkActionBar.tsx`

### Create — batch components
8. `src/components/batch/CsvDropzone.tsx`
9. `src/components/batch/csvTemplate.ts` — column schema + grouping logic
10. `src/components/batch/BatchPreviewTable.tsx`
11. `src/components/batch/BatchResultsTable.tsx`

### Create — lib + asset
12. `src/lib/csv-parse.ts` — wraps `papaparse`, applies grouping
13. `public/dashboard-template.csv`

### Modify
14. `src/lib/api.ts` — add `listProducts(query)`, `bulkDelete(ids)`, `bulkStatus(ids, status)`, `batchImport(products)`, `duplicateProduct(id, copyImages)` (duplicate = GET then POST with modified name; if `copyImages=true` also re-POST image URLs via the importer route).

**DO NOT:**
- Modify `src/app/products/new/page.tsx` — task 6/8 own it.
- Modify `ProductForm.tsx`, `PreviewPane.tsx`, or any product-form/preview internals.
- Modify `src/types/product.ts` — task 5 owns it.
- Touch `web-backend/` or `web-frontend/`.
- Add backend routes.

## 5. Conventions

- `'use client'` for interactive pages/components. Server components only for the shell of the edit page if you use `async` data loading with `getProduct(id)` in a Server Component — allowed and recommended.
- `papaparse` already installed by task 5. Use `Papa.parse` with `header: true, skipEmptyLines: true`.
- CSV grouping: a row with a non-empty `name` starts a new product; subsequent rows with empty `name` are additional variants for the same product. Use this rule in `csvTemplate.ts`.
- Table state (sort, filter, selection) lives in the page component, not in a context/store.
- Pagination: offset-based, 50 per page (matches backend default). Page buttons + current-page display.
- Row kebab menu actions: Edit, Preview, Duplicate, Delete.

## 6. Contract highlights

### `csvTemplate.ts`

Exports:
```ts
export const CSV_COLUMNS = [
  'name','brand','retail_price_inr','rent_price_inr','currency','category','collection','fabric','description','status',
  'variant_size','variant_colour','variant_quantity','variant_location',
  'image_urls', // pipe-separated
] as const;

export interface CsvRow { [K in typeof CSV_COLUMNS[number]]: string }

export function groupRowsIntoProducts(rows: CsvRow[]): BatchProductPayload[];
// Validation: each product must have name, retail_price_inr parseable, at least one variant row.
// Returns well-formed BatchProductPayload objects with image_urls split on '|' and trimmed.
```

### `dashboard-template.csv`

One worked example with **1 product and 6 variants**. First row has `name`, `brand`, prices, description, `image_urls` (2 URLs separated by `|`), plus the first variant. Next 5 rows leave product fields blank and carry only the variant columns.

### List view query

`ProductFilters` dispatches query state up to the page, which calls `listProducts(query)`. Filters: search `q`, brand autocomplete (reuse task 6's `AutocompleteInput`), category autocomplete, status pill (`all | draft | published`), sort dropdown.

### `BulkActionBar`

Shown only when selection count > 0. Actions: Delete (confirm dialog), Change Status → draft/published, Export CSV (client-side, just serialize the selected rows in memory). Export CSV does not need a backend route.

### Edit page `/products/[id]`

Loads product via `getProduct(id)`. Passes `initial` to `useProductFormState`. Renders the same split-pane layout as `/products/new` with real `PreviewPane`. Save button calls `updateProduct(id, payload)`. Delete button (top right) calls `deleteProduct(id)` after confirm.

### Standalone preview `/products/[id]/preview`

Full-width `PreviewPane` only, no form, no sidebar collapse needed. "Back to edit" link at top.

### Batch page `/products/batch`

Three steps:
1. **Drop zone** — `CsvDropzone` accepts a single `.csv`.
2. **Preview** — `BatchPreviewTable` shows grouped products with per-row Zod-style validation status (use client-side checks mirroring the backend's `ParsedProductSchema`). Row expand shows variants + image URLs. "Import N products" button enabled only if all rows valid.
3. **Results** — `BatchResultsTable` shows per-row outcomes from `batchImport(products)` (ok / error with reason). Retry button per failed row.

## 7. Step-by-step

1. Extend `api.ts` with the five new functions. Type them fully against `@/types/product` shapes.
2. Build list-view components (`ProductTable`, `ProductFilters`, `BulkActionBar`) and wire them into `src/app/products/page.tsx`.
3. Build edit page — server or client component, loads via `getProduct`, passes to `ProductForm`.
4. Build standalone preview page.
5. Build `csvTemplate.ts` + `csv-parse.ts`, then `CsvDropzone`, `BatchPreviewTable`, `BatchResultsTable`, then `src/app/products/batch/page.tsx`.
6. Write `public/dashboard-template.csv`.
7. Run tier-1 gate.

## 8. Do NOT

- ❌ `git commit` / `git push`.
- ❌ Modify task 5/6/7/8 files beyond `api.ts`.
- ❌ Add backend routes.
- ❌ Add dependencies (everything you need is already installed by task 5).
- ❌ Add a state management library.
- ❌ Use `any`.
- ❌ `npm run dev`.

## 9. Tier-1 gate (MANDATORY)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard
npx tsc --noEmit
npm run lint
npm run build
```
Then:
```bash
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/app/products/page.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/app/products/\[id\]/page.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/app/products/\[id\]/preview/page.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/app/products/batch/page.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/public/dashboard-template.csv
grep -n 'listProducts\|bulkDelete\|bulkStatus\|batchImport\|duplicateProduct' /Users/harsh/Desktop/style_supply/web-dashboard/src/lib/api.ts
```
All must succeed.

## 10. Tier-2 verification (DEFERRED — end-to-end smoke)

```bash
# With backend running + migration applied + bucket created:
# 1. /products/new → create a product → appears in /products
# 2. /products/batch → upload dashboard-template.csv → 1 product + 6 variants imported
# 3. Bulk-select 2 products, change status to Published → list reflects
# 4. Kebab → Duplicate → new "(copy)" product as draft
# 5. Kebab → Preview → standalone PDP renders full-width
```

## 11. Completion report format

```
## Task 9 — Dashboard List + Batch — COMPLETE

### Files created
<list 13>

### Files modified
- src/lib/api.ts

### Tier-1 gate output
<tsc + lint + build>

### Tier-2 smoke steps (deferred)
<copy §10>

### Deviations
<list or "None.">

### Open items
<anything still TODO, or "None.">
```
