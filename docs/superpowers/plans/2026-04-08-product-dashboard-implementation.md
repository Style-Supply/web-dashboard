# Product Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to dispatch each task to a fresh Claude Code instance. Each numbered task below corresponds to a standalone task file at `web-dashboard/docs/tasks/NN-short-name.md`. Steps use checkbox (`- [ ]`) syntax for tracking in this session.

**Goal:** Build an internal dashboard that lets StyleSupply staff populate the product catalog (Supabase) via a manual form with live PDP preview and a batch CSV upload. No customer-facing changes.

**Architecture:** Next.js 16 dashboard app at `web-dashboard/` talks to new admin routes at `web-backend/api/admin/products`. Shared Supabase project. New migration creates `products` / `product_variants` / `product_images` tables and a `product-images` storage bucket. Preview renders by copying the storefront PDP's hero + care components into the dashboard and prop-driving them from form state.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, TypeScript strict, Manrope, papaparse (dashboard). Express 4, Zod, Supabase JS, multer (backend). Supabase PostgreSQL + Storage.

**Spec:** `web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — read this before dispatching any task. Every task file is a synthesis of the relevant spec sections.

**Constraint:** No commits. All files are written for user review. No task may run `git commit` or `git push`.

---

## Prerequisites (one-time, before task 1)

- [ ] Verify a Supabase project exists and its credentials are in `web-backend/.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Task 1 does not need these populated to write code, but tier-2 verification will.
- [ ] Verify Supabase Storage is enabled on the project (`Project Settings → Storage`, one-click toggle — default-on for new projects).
- [ ] Confirm `web-backend` existing dev loop works: `cd web-backend && npm install && npm run build` passes.

---

## File Structure

This is the full file map. Every file gets created or modified by exactly one task. No task touches a file owned by another task.

### `web-backend/` (extended)

```
web-backend/
├── .env.example                                    [MODIFY — task 1]
├── src/
│   ├── config/
│   │   └── env.ts                                  [MODIFY — task 1]
│   ├── index.ts                                    [MODIFY — task 1]
│   ├── middleware/
│   │   └── admin.middleware.ts                     [CREATE — task 1]
│   ├── routes/
│   │   └── admin-products.routes.ts                [CREATE — task 2, extended inline by 3, 4]
│   ├── services/
│   │   └── image-import.service.ts                 [CREATE — task 3]
│   └── db/
│       └── migrations/
│           ├── 002_products.sql                    [CREATE — task 1]
│           └── 002_products.md                     [CREATE — task 1]
├── scripts/
│   └── create-storage-bucket.ts                    [CREATE — task 1]
└── package.json                                    [MODIFY — task 3 (add multer)]
```

### `web-dashboard/` (new)

```
web-dashboard/
├── package.json                                    [CREATE — task 5]
├── next.config.ts                                  [CREATE — task 5]
├── tsconfig.json                                   [CREATE — task 5]
├── postcss.config.mjs                              [CREATE — task 5]
├── eslint.config.mjs                               [CREATE — task 5]
├── .env.local.example                              [CREATE — task 5]
├── .gitignore                                      [CREATE — task 5]
├── middleware.ts                                   [CREATE — task 5]
├── public/
│   └── dashboard-template.csv                      [CREATE — task 9]
└── src/
    ├── app/
    │   ├── layout.tsx                              [CREATE — task 5]
    │   ├── page.tsx                                [CREATE — task 5]
    │   ├── globals.css                             [CREATE — task 5]
    │   ├── not-found.tsx                           [CREATE — task 5]
    │   └── products/
    │       ├── page.tsx                            [CREATE — task 9]
    │       ├── new/
    │       │   └── page.tsx                        [CREATE — task 6]
    │       ├── batch/
    │       │   └── page.tsx                        [CREATE — task 9]
    │       └── [id]/
    │           ├── page.tsx                        [CREATE — task 9]
    │           └── preview/
    │               └── page.tsx                    [CREATE — task 9]
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx                         [CREATE — task 5]
    │   │   └── TopBar.tsx                          [CREATE — task 5]
    │   ├── list/
    │   │   ├── ProductTable.tsx                    [CREATE — task 9]
    │   │   ├── ProductFilters.tsx                  [CREATE — task 9]
    │   │   └── BulkActionBar.tsx                   [CREATE — task 9]
    │   ├── product-form/
    │   │   ├── ProductForm.tsx                     [CREATE — task 6]
    │   │   ├── BasicFieldsBlock.tsx                [CREATE — task 6]
    │   │   ├── PricingBlock.tsx                    [CREATE — task 6]
    │   │   ├── VariantEditor.tsx                   [CREATE — task 6]
    │   │   ├── ImageImporter.tsx                   [CREATE — task 7]
    │   │   └── AutocompleteInput.tsx               [CREATE — task 6]
    │   ├── batch/
    │   │   ├── CsvDropzone.tsx                     [CREATE — task 9]
    │   │   ├── BatchPreviewTable.tsx               [CREATE — task 9]
    │   │   ├── BatchResultsTable.tsx               [CREATE — task 9]
    │   │   └── csvTemplate.ts                      [CREATE — task 9]
    │   ├── preview/
    │   │   ├── PreviewPane.tsx                     [CREATE — task 8]
    │   │   ├── ProductHeroPreview.tsx              [CREATE — task 8]
    │   │   ├── CareSection.tsx                     [CREATE — task 8]
    │   │   └── adapter.ts                          [CREATE — task 8]
    │   └── ui/
    │       ├── Button.tsx                          [CREATE — task 5]
    │       ├── Input.tsx                           [CREATE — task 5]
    │       ├── Textarea.tsx                        [CREATE — task 5]
    │       └── Dialog.tsx                          [CREATE — task 5]
    ├── hooks/
    │   ├── useProductFormState.ts                  [CREATE — task 6]
    │   └── useAutocomplete.ts                      [CREATE — task 6]
    ├── lib/
    │   ├── api.ts                                  [CREATE — task 5, extended by 6, 7, 9]
    │   ├── price.ts                                [CREATE — task 5]
    │   ├── csv-parse.ts                            [CREATE — task 9]
    │   └── url-check.ts                            [CREATE — task 7]
    └── types/
        └── product.ts                              [CREATE — task 5]
```

### Task files (generated by fresh CC instances)

```
web-dashboard/docs/tasks/
├── 01-backend-foundation.md                        [WRITTEN BY MAIN SESSION]
├── 02-backend-product-crud.md                      [WRITTEN BY FRESH INSTANCE]
├── 03-backend-image-service.md                     [WRITTEN BY FRESH INSTANCE]
├── 04-backend-batch-suggestions.md                 [WRITTEN BY FRESH INSTANCE]
├── 05-dashboard-scaffold.md                        [WRITTEN BY FRESH INSTANCE]
├── 06-dashboard-form.md                            [WRITTEN BY FRESH INSTANCE]
├── 07-dashboard-images.md                          [WRITTEN BY FRESH INSTANCE]
├── 08-dashboard-preview.md                         [WRITTEN BY FRESH INSTANCE]
└── 09-dashboard-list-batch.md                      [WRITTEN BY FRESH INSTANCE]
```

---

## Dependency graph

```
[Task 1] ─► [Task 2] ─► [Task 3] ─► [Task 4]

[Task 5] ─┬─► [Task 6] ──► [Task 7] ──┐
          │                           │
          └─► [Task 8] ────────────────┼─► [Task 9]
                                       │
                                       (task 9 also depends on 6, 7, 8)
```

**Parallelism opportunities:**
- Backend chain (1→2→3→4) and dashboard chain (5→6/8→7→9) run in parallel throughout.
- Tasks 2, 3, 4 are **serialized** because they all modify `admin-products.routes.ts`. Parallel writes to the same file would conflict. The three backend-chain tasks run sequentially, but each task is small enough that the whole chain finishes in roughly the same wall-clock time as the dashboard chain.
- After task 5: task 8 (preview) can run in parallel with task 6 (form). Task 7 waits on 6.
- Task 9 is the final integration — waits on 6, 7, 8 from the dashboard chain.

---

## Execution tasks

Each task below is a single "step" in this orchestration plan. Tasks 2–9 are dispatched to fresh CC instances. Task 1 is written by this session in full as the template.

### Task 0: Write task 1 template

**Responsibility:** Main session only. Produces `01-backend-foundation.md` in full so tasks 2–9 have a concrete pattern to follow.

- [ ] **Step 0.1: Write `01-backend-foundation.md`**

  Path: `web-dashboard/docs/tasks/01-backend-foundation.md`

  Use the task-file anatomy from spec §13.3:
  - Header ("You are picking up task 1 of 9…")
  - Working directory and repo layout
  - Relevant spec sections (§4 schema, §5.2 cross-cutting, §4.5 trigger, §4.6 RLS policy stubs) copy-pasted
  - Coding conventions (ESM `.js` imports, Zod, error format, no `any`)
  - Explicit file list with full absolute paths
  - Commands to run (`npm install`, `npm run build`, `npm run lint`)
  - Tier-1 + tier-2 acceptance criteria
  - "Do NOT" list (no commits, no touching non-listed files, no real policies)
  - Step-by-step body: (a) add `DASHBOARD_URL` to `.env.example` and `env.ts`, (b) extend CORS in `index.ts`, (c) create `admin.middleware.ts` no-op stub, (d) write `002_products.sql` migration, (e) write `002_products.md` description alongside, (f) write `scripts/create-storage-bucket.ts` fallback
  - Footer ("reply with files + tier-1 output")

- [ ] **Step 0.2: Verify template quality**

  Re-read the file. Check: no placeholders, code blocks are complete (not pseudocode), schema SQL matches spec §4 column-for-column, CORS update preserves existing `FRONTEND_URL`.

### Task 1: Backend foundation

**Dispatch:** Fresh CC instance. Input: the task file at `web-dashboard/docs/tasks/01-backend-foundation.md`.

**Produces:**
- Migration `web-backend/src/db/migrations/002_products.sql` (+ `.md` description)
- `web-backend/scripts/create-storage-bucket.ts`
- `web-backend/src/middleware/admin.middleware.ts` (no-op stub)
- Modified `web-backend/src/config/env.ts` (adds `DASHBOARD_URL` to Zod schema)
- Modified `web-backend/src/index.ts` (CORS accepts `DASHBOARD_URL` in addition to `FRONTEND_URL`)
- Modified `web-backend/.env.example` (adds `DASHBOARD_URL`)

**Tier-1 gate (mandatory):**
```bash
cd web-backend && npm run build
cd web-backend && npm run lint
```
Both pass. The migration file exists, opens in a SQL editor without errors, contains three `CREATE TABLE` statements and one `CREATE TRIGGER`.

**Tier-2 verification (deferred):**
```bash
# In Supabase SQL Editor, paste contents of 002_products.sql and run.
# Expected: three tables created, trigger installed.

# Create storage bucket:
cd web-backend && npx tsx scripts/create-storage-bucket.ts
# Expected: "Bucket 'product-images' created" or "already exists"
```

- [ ] **Step 1.1: Dispatch fresh CC instance with task file 1**

  Instance reads `web-dashboard/docs/tasks/01-backend-foundation.md` and executes.

- [ ] **Step 1.2: Verify tier-1 gate output**

  The instance reports: files created/modified + `tsc` + `lint` output. Visually diff against task file's file list.

### Task 2: Backend product CRUD + bulk routes

**Dispatch:** Fresh CC instance, **after task 1 passes tier-1**. Can run in parallel with task 3.

**First action the instance takes:** Read the spec at `web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` sections 4, 5, and 11, plus the existing `01-backend-foundation.md` as a pattern template, then write its own `02-backend-product-crud.md` to `web-dashboard/docs/tasks/02-backend-product-crud.md` **before coding**. This ensures the task file exists for audit.

**Produces:**
- `web-dashboard/docs/tasks/02-backend-product-crud.md` (the task file itself)
- `web-backend/src/routes/admin-products.routes.ts` (full file, structured in four sections that later tasks extend in-place):
  - **Section A — "Validation schemas"** at top of file: inline Zod schemas for CRUD and bulk route bodies, matching the existing `auth.routes.ts` convention. Tasks 3 and 4 will append to this section.
  - **Section B — "Product CRUD routes"**: `GET /api/admin/products` (with `q`, `brand`, `category`, `status`, `sort`, `limit`, `offset` query params), `GET /api/admin/products/:id`, `POST /api/admin/products`, `PATCH /api/admin/products/:id` (replaces variants wholesale), `DELETE /api/admin/products/:id`.
  - **Section C — "Bulk routes"**: `POST /api/admin/products/bulk-delete`, `POST /api/admin/products/bulk-status`.
  - **Section D — stub comment blocks** marking where task 3 (image routes) and task 4 (batch + suggestions routes) will insert their routes. Exact comment format:
    ```ts
    // ---- IMAGE ROUTES (task 3 inserts below) ----

    // ---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----
    ```
- Mount the router in `web-backend/src/index.ts` at `/api/admin/products`, behind `adminMiddleware` from task 1.
- TypeScript interfaces that tasks 5-9 will mirror: define in `web-backend/src/types/admin-products.types.ts` so the dashboard's `types/product.ts` can cross-reference the shapes.

**Stubs allowed:**
- `DELETE /api/admin/products/:id` handler does the DB cascade only. Storage-object cleanup is added by task 3 (see task 3's produces list). Leave a `// TODO task 3: remove storage objects via deleteAllImagesForProduct` comment at the exact line where the call will be inserted.

**Tier-1 gate:**
```bash
cd web-backend && npm run build && npm run lint
```
Both pass. `admin-products.routes.ts` exports a default router. Route handlers return correctly-typed responses.

**Tier-2 verification:**
```bash
# Once env.local is set and migration is run:
curl -X POST http://localhost:3001/api/admin/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","brand":"Baobab","retail_price_minor":2700000,"variants":[{"size":"S","colour":"Blue","quantity":1}]}'
# Expected: 201 with { id: "<uuid>", ... }

curl http://localhost:3001/api/admin/products
# Expected: 200 with { products: [...], total: 1 }
```

- [ ] **Step 2.1: Dispatch fresh CC instance for task 2**

- [ ] **Step 2.2: Verify task file was written + tier-1 gate output**

### Task 3: Backend image service + routes

**Dispatch:** Fresh CC instance, **after task 1 passes tier-1**. Parallel with task 2.

**First action:** Read spec §6 + §4.3 + `01-backend-foundation.md`, write `03-backend-image-service.md`.

**Produces:**
- `web-dashboard/docs/tasks/03-backend-image-service.md`
- `web-backend/src/services/image-import.service.ts` with:
  - `importFromUrl(productId: string, url: string): Promise<ImportResult>` — SSRF guards, fetch with 15s timeout, content-type + size validation, upload to Storage, insert row
  - `uploadFromBuffer(productId: string, buffer: Buffer, contentType: string, originalName?: string): Promise<ImportResult>` — same validation + upload pipeline
  - `deleteImage(imageId: string): Promise<void>` — removes from Storage and DB
  - `deleteAllImagesForProduct(productId: string): Promise<void>` — used by product delete cascade
- Routes inserted into the `// ---- IMAGE ROUTES (task 3 inserts below) ----` section of `web-backend/src/routes/admin-products.routes.ts`:
  - `POST /api/admin/products/:id/images/import` (body `{ urls: string[] }`)
  - `POST /api/admin/products/:id/images/upload` (multipart, multer, max 10 files)
  - `DELETE /api/admin/products/images/:imageId`
- Zod schemas `ImportFromUrlBody`, `ImportResult`, `FailedImport` appended to the "Validation schemas" section at the top of the same file.
- `multer` and `@types/multer` added to `web-backend/package.json`
- `DELETE /api/admin/products/:id` handler updated to call `deleteAllImagesForProduct` before cascading DB delete

**Tier-1 gate:**
```bash
cd web-backend && npm install && npm run build && npm run lint
```
All pass. `image-import.service.ts` exports the four functions with correct signatures.

**Tier-2 verification:**
```bash
curl -X POST http://localhost:3001/api/admin/products/<id>/images/import \
  -H 'Content-Type: application/json' \
  -d '{"urls":["https://picsum.photos/400/600"]}'
# Expected: 200 with { imported: [{...}], failed: [] }
```

- [ ] **Step 3.1: Dispatch fresh CC instance for task 3**

- [ ] **Step 3.2: Verify task file + tier-1 gate**

### Task 4: Backend batch + suggestions

**Dispatch:** Fresh CC instance, **after tasks 2 AND 3 pass tier-1**.

**First action:** Read spec §5, §10, §9.3 + `01-backend-foundation.md`, write `04-backend-batch-suggestions.md`.

**Produces:**
- `web-dashboard/docs/tasks/04-backend-batch-suggestions.md`
- Routes inserted into the `// ---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----` section of `admin-products.routes.ts`:
  - `POST /api/admin/products/batch`:
    - Accepts `{ products: ParsedProduct[] }` (up to 200 products)
    - Zod-validates whole payload
    - Per product: wraps in transaction (insert product → bulk-insert variants → call `importFromUrl` for each image URL sequentially; concurrency cap 3 across products)
    - Returns `[{ index, status: 'ok' | 'error', product_id?, error? }]`
  - `GET /api/admin/suggestions`:
    - Query params: `field` (`brand|category|collection|fabric|colour|location`), `q` (prefix)
    - Returns up to 10 distinct values: `SELECT DISTINCT {field} FROM products WHERE {field} ILIKE $1 ORDER BY {field} LIMIT 10` (or `product_variants` for colour/location)
    - Whitelist `field` values in a Zod enum — never interpolate arbitrary column names
- Zod schemas `BatchImportBody`, `ParsedProductSchema`, `BatchImportResult`, `SuggestionsQuery` appended to the "Validation schemas" section at the top of the same file.

**Tier-1 gate:**
```bash
cd web-backend && npm run build && npm run lint
```
Both pass. Routes exist and type-check.

**Tier-2 verification:**
```bash
curl http://localhost:3001/api/admin/suggestions?field=brand&q=bao
# Expected: 200 with { values: ["Baobab", ...] }

curl -X POST http://localhost:3001/api/admin/products/batch \
  -H 'Content-Type: application/json' \
  -d '{"products":[{"name":"A","brand":"X","retail_price_minor":1000,"variants":[{"size":"S","quantity":1}]}]}'
# Expected: 200 with [{ index: 0, status: "ok", product_id: "<uuid>" }]
```

- [ ] **Step 4.1: Dispatch fresh CC instance for task 4**

- [ ] **Step 4.2: Verify task file + tier-1 gate**

### Task 5: Dashboard scaffold

**Dispatch:** Fresh CC instance. Independent of backend tasks — can run in parallel with tasks 1–4.

**First action:** Read spec §7 + §4 + `01-backend-foundation.md`, write `05-dashboard-scaffold.md`.

**Produces:**
- `web-dashboard/docs/tasks/05-dashboard-scaffold.md`
- Full Next.js 16 scaffold at `web-dashboard/`:
  - `package.json` (Next 16, React 19, Tailwind v4, TypeScript 5.9, `papaparse`, `@types/papaparse`)
  - `next.config.ts`, `tsconfig.json` (strict, path alias `@/*` → `src/*`), `postcss.config.mjs`, `eslint.config.mjs`
  - `.env.local.example` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
  - `.gitignore`
  - `middleware.ts` (empty stub — future auth hook)
  - `src/app/layout.tsx` — root shell with sidebar + Manrope font + Tailwind `@theme`
  - `src/app/page.tsx` — redirects to `/products`
  - `src/app/globals.css` — Tailwind v4 `@theme` block with tokens copied from frontend (`#7A021D`, `#2C0505`, `#F2F2F2`)
  - `src/app/not-found.tsx`
  - `src/components/layout/Sidebar.tsx`, `TopBar.tsx`
  - `src/components/ui/Button.tsx`, `Input.tsx`, `Textarea.tsx`, `Dialog.tsx` (minimal primitives)
  - `src/lib/api.ts` — fetch wrappers for the admin routes (uses `process.env.NEXT_PUBLIC_API_BASE_URL` with default `http://localhost:3001`)
  - `src/lib/price.ts` — `toMinor(rupees: number): number`, `fromMinor(minor: number): number`, `formatINR(minor: number): string`
  - `src/types/product.ts` — TypeScript interfaces mirroring backend Zod shapes: `Product`, `ProductVariant`, `ProductImage`, `ProductPayload`, `BatchProductPayload`

**Stubs allowed:**
- `api.ts` returns typed stubs for routes not yet implemented — use `Promise<T>` with sensible fakes behind a `if (process.env.NODE_ENV === 'test')` gate, or just `Promise.resolve(...)` placeholders that'll compile.
- Sidebar nav links can point at routes that don't exist yet (tasks 6, 7, 8, 9 create them).

**Tier-1 gate:**
```bash
cd web-dashboard && npm install
cd web-dashboard && npx tsc --noEmit
cd web-dashboard && npm run lint
cd web-dashboard && npm run build
```
All four pass. `npm run dev` is NOT part of the gate (it would try to bind a port).

**Tier-2 verification:**
```bash
cd web-dashboard && npm run dev
# Navigate to http://localhost:3000 → should redirect to /products (even if 404 since /products doesn't exist yet)
```

- [ ] **Step 5.1: Dispatch fresh CC instance for task 5**

- [ ] **Step 5.2: Verify task file + tier-1 gate**

### Task 6: Dashboard product form + variant editor + autocomplete

**Dispatch:** Fresh CC instance, **after task 5 passes tier-1**.

**First action:** Read spec §9 + §4 + `01-backend-foundation.md`, write `06-dashboard-form.md`.

**Produces:**
- `web-dashboard/docs/tasks/06-dashboard-form.md`
- `src/app/products/new/page.tsx` — mounts `ProductForm` in split layout (form left, `PreviewPane` placeholder right — real `PreviewPane` lands in task 8 and gets wired in then)
- `src/components/product-form/ProductForm.tsx` — orchestrator
- `src/components/product-form/BasicFieldsBlock.tsx` — name, brand, category, collection, description
- `src/components/product-form/PricingBlock.tsx` — retail + rent price inputs with `lib/price.ts` formatting
- `src/components/product-form/VariantEditor.tsx` — add/remove size × colour rows with duplicate detection
- `src/components/product-form/AutocompleteInput.tsx` — typeahead with 250ms debounce, arrow keys, Esc
- `src/hooks/useProductFormState.ts` — single source of truth for form state (matches `types/product.ts#ProductPayload`)
- `src/hooks/useAutocomplete.ts` — debounced call to `GET /api/admin/suggestions`
- Extend `src/lib/api.ts` with `saveProduct(payload)`, `updateProduct(id, payload)`, `getProduct(id)`, `deleteProduct(id)`, `getSuggestions(field, q)` — real fetches now
- `ImageImporter` is imported as a stub component from `src/components/product-form/ImageImporter.tsx` (which task 7 will create). Stub: `export default function ImageImporter() { return <div>Stub: task 7</div>; }`

**Tier-1 gate:**
```bash
cd web-dashboard && npx tsc --noEmit && npm run lint && npm run build
```

**Tier-2 verification:**
```bash
cd web-dashboard && npm run dev
# Navigate to /products/new
# Type in "brand" field → suggestions dropdown should appear (calls real backend)
# Add variants → duplicate row detection works
# Click "Save draft" → POST to backend, redirect to /products/:id
```

- [ ] **Step 6.1: Dispatch fresh CC instance for task 6**

- [ ] **Step 6.2: Verify task file + tier-1 gate**

### Task 7: Dashboard image importer

**Dispatch:** Fresh CC instance, **after task 6 passes tier-1**.

**First action:** Read spec §9.5 + §6 + `01-backend-foundation.md`, write `07-dashboard-images.md`.

**Produces:**
- `web-dashboard/docs/tasks/07-dashboard-images.md`
- `src/components/product-form/ImageImporter.tsx` — full component replacing the task-6 stub:
  - URL mode: textarea, "Import from URLs" button
  - Upload mode: drag-and-drop zone + "Choose files" button
  - Grid of image cards below: drag-to-reorder (updates `sort_order`), alt-text input, delete button
  - Per-item status overlays (spinner / ✓ / ✗)
  - On `/products/new` before save: shows "Save draft first" banner
- `src/lib/url-check.ts` — client-side URL validation (shape only; backend does SSRF checks)
- Extend `src/lib/api.ts` with `importImagesFromUrls(productId, urls)`, `uploadImages(productId, files)`, `deleteImage(imageId)`, `reorderImages(productId, imageIds)`
- `ProductForm.tsx` wires `ImageImporter` (replaces the stub import — no other changes)

**Tier-1 gate:**
```bash
cd web-dashboard && npx tsc --noEmit && npm run lint && npm run build
```

**Tier-2 verification:**
```bash
# On /products/:id (existing product):
# 1. Paste URLs → "Import" → images appear as cards
# 2. Drag to reorder → order persists on reload
# 3. Drop files → uploads succeed
```

- [ ] **Step 7.1: Dispatch fresh CC instance for task 7**

- [ ] **Step 7.2: Verify task file + tier-1 gate**

### Task 8: Dashboard preview pane

**Dispatch:** Fresh CC instance, **after task 5 passes tier-1**. Can run in parallel with task 6 or 7, but task 6's ProductForm layout expects a `PreviewPane` placeholder — which task 8 fills.

**First action:** Read spec §8 + `web-frontend/src/app/product/[id]/page.tsx` (lines 68-247) + `web-frontend/src/components/sections/CareSection.tsx` + `01-backend-foundation.md`, write `08-dashboard-preview.md`.

**Produces:**
- `web-dashboard/docs/tasks/08-dashboard-preview.md`
- `src/components/preview/ProductHeroPreview.tsx` — direct copy of the `ProductHero` function from `web-frontend/src/app/product/[id]/page.tsx` (lines ~68–247), converted to take props: `{ title, brand, originalPrice, currentPrice, description, images, sizeOptions, unavailableSizes, onSizeChange? }`. All hardcoded constants become props or default values.
- `src/components/preview/CareSection.tsx` — direct copy of `web-frontend/src/components/sections/CareSection.tsx`. No changes.
- `src/components/preview/PreviewPane.tsx` — wraps `ProductHeroPreview` + `CareSection` in the same `max-w-360 bg-white` container the storefront uses.
- `src/components/preview/adapter.ts` — exports `formStateToPreviewProduct(state: ProductPayload & { images: ImagePreview[] }): PreviewProductProps`. Handles empty states, derives `SIZE_OPTIONS` / `UNAVAILABLE_SIZES` from variants, prefers `public_url` then falls back to `source_url` for images.
- `src/app/products/new/page.tsx` — updated to replace the task-6 placeholder with real `PreviewPane` wired to `useProductFormState`

**Required source files to read (frontend, reference only, DO NOT MODIFY):**
- `/Users/harsh/Downloads/style-supply/web-frontend/src/app/product/[id]/page.tsx`
- `/Users/harsh/Downloads/style-supply/web-frontend/src/components/sections/CareSection.tsx`

**Tier-1 gate:**
```bash
cd web-dashboard && npx tsc --noEmit && npm run lint && npm run build
```

**Tier-2 verification:**
```bash
cd web-dashboard && npm run dev
# Navigate to /products/new
# Type into name / price / description → right pane updates live
# Add variants with different sizes → size picker reflects availability
# Paste image URL → image appears in hero immediately (pre-upload)
```

- [ ] **Step 8.1: Dispatch fresh CC instance for task 8**

- [ ] **Step 8.2: Verify task file + tier-1 gate**

### Task 9: Dashboard list + edit + batch + standalone preview

**Dispatch:** Fresh CC instance, **after tasks 5, 6, 7, 8 pass tier-1**. Final integration task.

**First action:** Read spec §10 + §11 + `01-backend-foundation.md`, write `09-dashboard-list-batch.md`.

**Produces:**
- `web-dashboard/docs/tasks/09-dashboard-list-batch.md`
- `src/app/products/page.tsx` — list view composed from `ProductTable`, `ProductFilters`, `BulkActionBar`
- `src/app/products/[id]/page.tsx` — edit view; reuses `ProductForm` preloaded via `getProduct(id)`
- `src/app/products/[id]/preview/page.tsx` — standalone full preview; reuses `PreviewPane` preloaded via `getProduct(id)`
- `src/app/products/batch/page.tsx` — CSV upload flow
- `src/components/list/ProductTable.tsx` — sortable columns, checkbox selection, kebab row menu (Edit/Preview/Duplicate/Delete)
- `src/components/list/ProductFilters.tsx` — search + brand/category/status filters
- `src/components/list/BulkActionBar.tsx` — sticky bar with Delete, Change Status, Export CSV
- `src/components/batch/CsvDropzone.tsx` — accepts `.csv`
- `src/components/batch/csvTemplate.ts` — defines the column schema, row grouping logic (group by blank product-level fields)
- `src/components/batch/BatchPreviewTable.tsx` — expandable rows with Zod validation status
- `src/components/batch/BatchResultsTable.tsx` — per-row outcome with retry
- `src/lib/csv-parse.ts` — wraps `papaparse` + applies grouping
- `public/dashboard-template.csv` — worked example
- Extend `src/lib/api.ts` with `listProducts(query)`, `bulkDelete(ids)`, `bulkStatus(ids, status)`, `batchImport(products)`, `duplicateProduct(id, copyImages)`

**Tier-1 gate:**
```bash
cd web-dashboard && npx tsc --noEmit && npm run lint && npm run build
```
All four routes compile. List page renders without runtime errors during static analysis.

**Tier-2 verification (end-to-end smoke test):**
```bash
# With backend running + migration applied + bucket created:
# 1. Create a product manually via /products/new → appears in /products list
# 2. Upload dashboard-template.csv on /products/batch → 1 product + 6 variants imported
# 3. Bulk-select 2 products, change status to Published
# 4. Click kebab → Duplicate → new "(copy)" product appears as draft
# 5. Click preview → standalone PDP renders full-width
```

- [ ] **Step 9.1: Dispatch fresh CC instance for task 9**

- [ ] **Step 9.2: Verify task file + tier-1 gate**

- [ ] **Step 9.3: Document tier-2 verification status**

  After tasks 1–9 all pass tier-1, the user performs tier-2 verification manually in their environment (env vars set, migration run, bucket created). This plan does not block on tier-2 since env setup is out of scope for code generation.

---

## Self-review checklist

- [ ] **Spec coverage.** Every section of the spec maps to at least one task:
  - §4 schema → task 1
  - §5 API routes → tasks 2, 3, 4
  - §6 image flow → task 3
  - §7 app structure → task 5
  - §8 preview → task 8
  - §9 form → tasks 6, 7
  - §10 batch → task 9
  - §11 list → task 9
  - §12 deferred auth → task 1 (middleware stub)
  - §13 task split → this plan

- [ ] **Placeholder scan.** No "TBD", "TODO", "fill in", "similar to task N", or "write tests for the above" in this plan (the `TODO` comments inside task descriptions refer to stub markers in generated code, not plan gaps).

- [ ] **Type consistency.** Names used across tasks are consistent:
  - `ProductPayload` — defined in task 5, used in tasks 6, 7, 8, 9
  - `ProductVariant`, `ProductImage` — defined in task 5, used everywhere
  - `importFromUrl`, `uploadFromBuffer`, `deleteImage`, `deleteAllImagesForProduct` — defined in task 3, called in tasks 2 (product delete cascade) and 4 (batch image imports)
  - `formStateToPreviewProduct` — defined in task 8, used in tasks 6 (new form) and 9 (edit form)
  - Inline Zod schemas in `admin-products.routes.ts` — `ImportFromUrlBody`, `ImportResult`, `FailedImport`, `BatchImportBody`, `BatchImportResult`, `SuggestionsQuery` — progressively appended to the "Validation schemas" section by tasks 2, 3, 4

- [ ] **No commits.** No task instructs `git commit` or `git push`. Every task's "produces" section ends at writing files, and every tier-1 gate is "tsc + lint + build" — no git.

- [ ] **Env-var independence.** Every task's tier-1 gate works without `.env` / `.env.local`. Tier-2 verification is clearly marked as deferred.

- [ ] **Two-tier gates.** Every task has both tier-1 and tier-2 defined.

---

## Open items

None.
