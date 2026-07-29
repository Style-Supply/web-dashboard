# StyleSupply Product Dashboard — Design Spec

**Status:** Draft — pending implementation
**Date:** 2026-04-08
**Owner:** Harsh
**Related repos:** `web-dashboard/` (new), `web-backend/` (extended), `web-frontend/` (reference only)

---

## 1. Purpose

Build an internal dashboard that lets StyleSupply staff populate the product catalog. Two entry modes:

1. **Manual** — one product at a time via a form, with a live PDP preview.
2. **Batch** — upload a CSV in the dashboard's own format, with per-row validation and results.

The dashboard writes to the existing Supabase project used by `web-backend`. Product tables don't exist yet and are designed here from scratch.

## 2. Non-goals

- **No customer-facing changes.** The existing `web-frontend` stays static; this spec does not wire the storefront to the database.
- **No authentication for v1.** Design has a clean hookpoint (`admin.middleware.ts`) so auth can be added later without refactoring routes.
- **No scraping of brand websites.** Image import takes explicit URLs or file uploads — no HTML parsing.
- **No rich product editor features** (inline description formatting, bundled products, seasonal pricing, discount rules). Add later if needed.
- **No customer reviews, wishlists, or inventory reservation logic.** Out of scope.

## 3. Architecture summary

Three-piece split across two repos:

- **`web-dashboard/`** — new Next.js 16 app (matches frontend stack for preview parity). Contains the UI only.
- **`web-backend/`** — existing Express + Supabase API. New routes added under `/api/admin/products`, new migration `002_products.sql`, new admin middleware, new image-import service.
- **`web-frontend/`** — not modified. Two PDP components are **copied** into the dashboard for the preview (see §8).

**Supabase is the single shared datastore.** The dashboard calls the backend; the backend writes to Supabase. The frontend will eventually read the same tables.

**No commits.** All files are written but never committed by Claude. The user reviews and commits manually.

## 4. Database schema

New migration: `web-backend/src/db/migrations/002_products.sql`. Run manually in Supabase SQL Editor, same pattern as `001_profiles_addresses.sql`.

### 4.1 `products` — shared fields per product

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `name` | `text` | NO | — | |
| `brand` | `text` | YES | — | freetext, autocomplete-backed |
| `retail_price_minor` | `integer` | NO | — | MSRP in paise (e.g. ₹27,000 → `2700000`) |
| `rent_price_minor` | `integer` | YES | — | optional rental price in paise |
| `currency` | `text` | NO | `'INR'` | |
| `category` | `text` | YES | — | freetext, autocomplete-backed |
| `collection` | `text` | YES | — | freetext, autocomplete-backed |
| `fabric` | `text` | YES | — | "Fabric/Material" |
| `description` | `text` | YES | — | "Description and Details" |
| `status` | `text` | NO | `'draft'` | `draft` \| `published` |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | auto-updated via trigger |

### 4.2 `product_variants` — one row per size × colour combo

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `product_id` | `uuid` | NO | — | FK `products(id)` `ON DELETE CASCADE` |
| `size` | `text` | NO | — | `XS`, `S`, `M`, `L`, `XL`, `XXL`, `Free Size`, or custom |
| `colour` | `text` | YES | — | freetext, autocomplete-backed |
| `quantity` | `integer` | NO | `0` | |
| `location` | `text` | YES | — | freetext, autocomplete-backed (e.g. `Bandra`) |
| `created_at` | `timestamptz` | NO | `now()` | |

**Unique constraint:** `(product_id, size, colour, location)`.

### 4.3 `product_images` — gallery, uploaded to Supabase Storage

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `product_id` | `uuid` | NO | — | FK `products(id)` `ON DELETE CASCADE` |
| `storage_path` | `text` | NO | — | e.g. `products/{product_id}/{uuid}.jpg` |
| `public_url` | `text` | NO | — | Supabase Storage public URL |
| `source_url` | `text` | YES | — | original URL fetched; `NULL` for file uploads |
| `alt` | `text` | YES | — | user-editable alt text |
| `sort_order` | `integer` | NO | `0` | display order, drag-to-reorder |
| `created_at` | `timestamptz` | NO | `now()` | |

### 4.4 Supabase Storage bucket

Bucket `product-images`, public read, service-role write, max file size 10 MB, allowed mime types `image/jpeg`, `image/png`, `image/webp`. Creation included in the migration via `insert into storage.buckets (...)`. Fallback script: `web-backend/scripts/create-storage-bucket.ts` runs the same bucket setup via the Supabase admin API if SQL creation is blocked.

### 4.5 Triggers

Reuse the existing `handle_updated_at()` function. Attach to `products`:

```sql
create trigger on_product_updated
  before update on public.products
  for each row execute procedure public.handle_updated_at();
```

### 4.6 Row Level Security

RLS stays **off** on all three new tables for v1 (no auth). The migration includes commented-out policy stubs pointing at where admin/staff policies will go when auth lands. Rationale: adding RLS without auth just blocks the service-role client for no benefit and invites subtle bugs when auth is later added.

### 4.7 Price representation

All prices stored as `integer` in the smallest currency unit (paise for INR). UI displays as `₹27,000` with thousands separators; `lib/price.ts` converts both ways. Avoids float-precision bugs and matches conventions used by Stripe and Razorpay.

## 5. Backend API surface

All new routes live in `web-backend/src/routes/admin-products.routes.ts` and mount at `/api/admin/products` in `src/index.ts`.

### 5.1 Route table

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/products` | List with `q`, `brand`, `category`, `status`, `sort`, `limit`, `offset` query params. Returns products + first image + variant counts. |
| `GET` | `/api/admin/products/:id` | Fetch one product with all variants and all images. |
| `POST` | `/api/admin/products` | Create product + variants (single manual entry). |
| `PATCH` | `/api/admin/products/:id` | Update product fields; replaces variants wholesale. |
| `DELETE` | `/api/admin/products/:id` | Delete product; cascades variants/images; removes storage objects. |
| `POST` | `/api/admin/products/bulk-delete` | Body `{ ids: string[] }`. |
| `POST` | `/api/admin/products/bulk-status` | Body `{ ids: string[], status: 'draft' \| 'published' }`. |
| `POST` | `/api/admin/products/batch` | Body `ParsedProduct[]` from client-side CSV parse. Validates + imports in per-product transactions. |
| `POST` | `/api/admin/products/:id/images/import` | Body `{ urls: string[] }`. Fetches + re-uploads to Storage. |
| `POST` | `/api/admin/products/:id/images/upload` | Multipart, up to 10 files per request. |
| `DELETE` | `/api/admin/products/images/:imageId` | Remove one image (Storage + DB row). |
| `GET` | `/api/admin/suggestions` | Query params: `field` (`brand`\|`category`\|`collection`\|`fabric`\|`colour`\|`location`), `q` (prefix). Returns up to 10 distinct values. |

### 5.2 Cross-cutting

- **`admin.middleware.ts`** — new middleware, applied to every `/api/admin/*` route. **No-op for v1.** Contains a clearly marked `TODO` showing exactly where to plug in a role check or shared-secret check. Zero behavioural impact until someone opts in.
- **CORS** — `src/index.ts` currently allows only `env.FRONTEND_URL`. Extend the origin option to an array that also includes a new `env.DASHBOARD_URL`. Add `DASHBOARD_URL` to `.env.example` and to the Zod schema in `src/config/env.ts`.
- **CSRF** — skipped for `/api/admin/*` routes for v1. The existing `generateCsrfToken` middleware is cookie/session-based and we have no session.
- **Validation** — every request body validated with Zod schemas at the top of `admin-products.routes.ts`. Matches backend convention.
- **Error format** — keep the existing `{ error: { code: 'ERROR_CODE', message: 'Human readable' } }` shape.
- **Client usage** — `supabaseAdmin` for all writes (bypasses RLS). Do not use the anon client here.

## 6. Image import flow

Service: `web-backend/src/services/image-import.service.ts`. Used by both URL-import and file-upload routes; difference is only in how the bytes are obtained.

### 6.1 URL flow (`POST /api/admin/products/:id/images/import`)

For each URL, sequentially:

1. **Shape validation.** Must be `http(s)://`. Reject `file://`, `data:`, private IPs (`127.*`, `10.*`, `192.168.*`, `169.254.*`, `localhost`, IPv6 equivalents). SSRF guard.
2. **Fetch.** `fetch(url, { headers: { 'User-Agent': 'StyleSupplyBot/1.0', 'Accept': 'image/*' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) })`.
3. **Response check.** `res.ok` required; `content-type` must start with `image/`; `content-length` must be ≤ 10 MB.
4. **Extension derivation.** `image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`. Reject anything else.
5. **Path.** `products/{product_id}/{crypto.randomUUID()}.{ext}`.
6. **Upload.** `supabaseAdmin.storage.from('product-images').upload(path, buffer, { contentType, cacheControl: '31536000', upsert: false })`.
7. **Public URL.** `supabaseAdmin.storage.from('product-images').getPublicUrl(path).data.publicUrl`.
8. **DB row.** Insert into `product_images` with `source_url` set, `sort_order = max(existing) + 1`.

### 6.2 Upload flow (`POST /api/admin/products/:id/images/upload`)

Multipart via `multer` (to be added as a backend dependency). Up to 10 files per request. Each file goes through the same validation, upload, and DB insertion pipeline as the URL flow, except `source_url` is `NULL`.

### 6.3 Response shape

```ts
{
  imported: Array<{ id: string; public_url: string; source_url: string | null; sort_order: number }>;
  failed:   Array<{ source_url?: string; filename?: string; reason: string }>;
}
```

### 6.4 Deletion

`DELETE /api/admin/products/images/:imageId` and cascade-on-product-delete both call `supabaseAdmin.storage.from('product-images').remove([storage_path])` in addition to deleting the DB row.

### 6.5 Edge cases

- Duplicate import (same URL twice) — creates two rows; the dashboard dedupes before sending.
- 403/401 on fetch — flagged as failed with HTTP status in the `reason`.
- Redirects — followed automatically by `fetch`.

## 7. Dashboard app structure

New Next.js 16 app at `web-dashboard/`. Matches frontend stack so the copied PDP components render identically.

### 7.1 Tech choices

- Next.js 16 + React 19 (same as frontend)
- Tailwind CSS v4 with `@theme` in `globals.css` (same as frontend)
- TypeScript strict mode, path alias `@/*` → `src/*`
- Manrope via `next/font`
- `papaparse` for client-side CSV parsing
- No state library — React state + a single `useProductFormState` hook

### 7.2 Directory layout

```
web-dashboard/
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.local.example
├── middleware.ts               # placeholder for future auth
├── public/
│   └── dashboard-template.csv
└── src/
    ├── app/
    │   ├── layout.tsx          # sidebar shell + fonts + design tokens
    │   ├── page.tsx            # redirects to /products
    │   ├── globals.css         # tailwind v4 @theme
    │   ├── not-found.tsx
    │   └── products/
    │       ├── page.tsx        # list view
    │       ├── new/page.tsx    # manual create (form + preview split)
    │       ├── batch/page.tsx  # CSV batch upload
    │       └── [id]/
    │           ├── page.tsx            # edit (same form, preloaded)
    │           └── preview/page.tsx    # standalone full preview
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   ├── list/
    │   │   ├── ProductTable.tsx
    │   │   ├── ProductFilters.tsx
    │   │   └── BulkActionBar.tsx
    │   ├── product-form/
    │   │   ├── ProductForm.tsx
    │   │   ├── BasicFieldsBlock.tsx
    │   │   ├── PricingBlock.tsx
    │   │   ├── VariantEditor.tsx
    │   │   ├── ImageImporter.tsx
    │   │   └── AutocompleteInput.tsx
    │   ├── batch/
    │   │   ├── CsvDropzone.tsx
    │   │   ├── BatchPreviewTable.tsx
    │   │   ├── BatchResultsTable.tsx
    │   │   └── csvTemplate.ts
    │   ├── preview/
    │   │   ├── PreviewPane.tsx
    │   │   ├── ProductHeroPreview.tsx   # copy of frontend PDP hero
    │   │   ├── CareSection.tsx          # copy of frontend CareSection
    │   │   └── adapter.ts               # formState → preview props
    │   └── ui/                 # shared primitives (button, input, dialog)
    ├── hooks/
    │   ├── useProductFormState.ts
    │   └── useAutocomplete.ts
    ├── lib/
    │   ├── api.ts              # fetch wrappers for backend admin routes
    │   ├── price.ts            # ₹27,000 ↔ 2700000
    │   ├── csv-parse.ts
    │   └── url-check.ts
    └── types/
        └── product.ts          # mirrors backend Zod shapes
```

### 7.3 Route behaviour summary

| Route | What it does |
|---|---|
| `/products` | List view (see §11) |
| `/products/new` | Manual create: split screen, form on left, sticky preview on right |
| `/products/batch` | CSV upload, client-side parse, validation table, import |
| `/products/:id` | Edit — same `ProductForm` preloaded with product data |
| `/products/:id/preview` | Full-width standalone preview, loads data from backend |

### 7.4 Design system

Design tokens copied from `web-frontend`:

- Primary red `#7A021D`, dark brown `#2C0505`, light bg `#F2F2F2`
- Manrope font via `next/font` exposed as `--font-manrope`
- Tailwind v4 `@theme` block in `globals.css`

Sidebar and list-view chrome use a neutral admin palette (grays/whites). Red is reserved for primary CTAs ("Publish", "Delete confirm") so it visually matches the storefront.

## 8. Preview pane

### 8.1 Components

Two files copied from `web-frontend` into `web-dashboard/src/components/preview/`:

1. **`ProductHeroPreview.tsx`** — extracted from `web-frontend/src/app/product/[id]/page.tsx` (the `ProductHero` function, lines ~68–247). Converted from reading hardcoded `PRODUCT_IMAGES` / `SIZE_OPTIONS` / `UNAVAILABLE_SIZES` constants to taking them as props. No other logic changes.
2. **`CareSection.tsx`** — direct copy of `web-frontend/src/components/sections/CareSection.tsx`. Static for v1. When product-specific care fields land later, this becomes prop-driven.

Wrapped in `PreviewPane` which applies the same `max-w-360 bg-white` container and section-gap spacing the storefront uses. Output is visually identical to the storefront PDP.

### 8.2 State → props adapter

`components/preview/adapter.ts` exports `formStateToPreviewProduct(state)`:

| Form field | Preview field | Transform |
|---|---|---|
| `name` | title | passthrough (or `"Product name"` placeholder when empty) |
| `brand` | "By {brand}" line | wrapped |
| `retail_price_minor` | `originalPrice` | `formatINR(x / 100)` → `"27,000/-"` |
| `rent_price_minor` | `currentPrice` | same format; `"—"` if `null` |
| `description` | Description accordion content | passthrough |
| `images[]` | `PRODUCT_IMAGES` | sorted by `sort_order`, mapped to `{ id, src, alt }` |
| `variants[]` | `SIZE_OPTIONS`, `UNAVAILABLE_SIZES` | derived: union of sizes across variants; unavailable if `SUM(quantity)=0` |

### 8.3 Images before upload

The importer keeps a client-side list of pending URLs. The adapter prefers `public_url` (uploaded) but falls back to `source_url` (pending) for display. This means the preview reflects pasted URLs the instant they're entered, before the import round-trip completes. For file uploads before the round-trip, `URL.createObjectURL` provides the same behaviour.

### 8.4 Interactions

- Size picker is functional — clicking a size updates the "3 Left!!" badge from that size's variant quantity.
- Thumbnail strip clicks swap the main image.
- "Save to Closet" / "Add to Bag" buttons render but are disabled.
- Accordion sections (Description / Shipping / Delivery) work as expected. Description pulls from form state; Shipping and Delivery stay static for v1.

### 8.5 Standalone preview

`/products/:id/preview` renders the same components but loads data from `GET /api/admin/products/:id` instead of form state. Full width, no form. URL is shareable for async review.

### 8.6 Why copy instead of import

The frontend isn't set up as a workspace package, the repos aren't linked, and the user's constraint rules out a monorepo migration. Copying is intentional and temporary: once the storefront wires up to the backend, these files can graduate to a shared package. Two files (~300 lines total) duplicated is an acceptable v1 tradeoff for repo independence.

## 9. Manual product form

Lives at `/products/new` and `/products/:id`. Same `ProductForm` component, different initial state.

### 9.1 Layout

Two-column split on desktop (`lg:grid-cols-[1.1fr_1fr]`), stacked on mobile. Form left, preview right (sticky). Every keystroke updates the preview.

### 9.2 Form blocks

1. **Basic info** — `name` (text), `brand` (autocomplete), `category` (autocomplete), `collection` (autocomplete), `description` (textarea)
2. **Pricing** — `retail_price` (required, "Retail / MSRP"), `rent_price` (optional, "Rent price"). Both with `₹` prefix and thousands formatting.
3. **Material** — `fabric` (autocomplete)
4. **Variants** — `VariantEditor` (see §9.4)
5. **Images** — `ImageImporter` (see §9.5)
6. **Status** — toggle: Draft / Published
7. **Actions** — "Save draft", "Publish" (primary, red), "Delete" (edit only, confirmation modal)

### 9.3 `AutocompleteInput`

Props: `field: 'brand' | 'category' | 'collection' | 'fabric' | 'colour' | 'location'`, `value`, `onChange`.

Behaviour:
- On focus or keystroke, debounced 250 ms call to `GET /api/admin/suggestions?field=brand&q=bao`.
- Shows up to 10 matching distinct values in a floating dropdown.
- Arrow keys navigate, Enter picks, Esc closes, mouse click picks.
- Freeform typing is always allowed. The dropdown is advisory, not a whitelist.
- New values are automatically picked up by future suggestion queries because they're now in the table — no separate "save as tag" step.

### 9.4 `VariantEditor`

Table-style rows, columns: `Size`, `Colour`, `Quantity`, `Location`, delete button.

- Size is a compact picker: quick-select buttons for `XS`, `S`, `M`, `L`, `XL`, `XXL`, `Free Size`, plus a "Custom" option that reveals a text input (supports values like `W28`, `EU38`).
- Colour and Location use `AutocompleteInput`.
- Quantity is a numeric input, min 0.
- "Add variant" button appends a blank row.
- Client-side validation: at least 1 variant required before publish; duplicate `(size, colour, location)` rows flagged inline.

### 9.5 `ImageImporter`

Two entry modes in the same block:

- **URL mode** — textarea for URLs separated by newlines or commas; "Import from URLs" button.
- **Upload mode** — drag-and-drop zone + "Choose files" button, accepts multiple image files.

Both terminate at the same `product_images` rows via the two backend routes. Mix-and-match is fine — paste 3 URLs, drop 2 files, the preview shows all 5 together.

Below the entry controls: a grid of image cards. Each shows the image, a drag handle for reordering (updates `sort_order`), an alt-text input, and a delete button. Per-item status overlays (spinner → ✓ / ✗ with reason) appear during import/upload. Failed items stay selectable for retry.

**On `/products/new`, before save:** images cannot be imported yet because no `product_id` exists. The form requires a "Save draft" first; after save, the UI redirects to `/products/:id` and the importer becomes active. Rationale: keeps image paths tied to a real `product_id` and simplifies the hot creation path.

### 9.6 Validation gates

- **Save draft:** only `name` + `retail_price_minor` required. Everything else optional.
- **Publish:** adds `≥ 1 variant`, `≥ 1 image`, non-empty `description`, non-empty `brand`.

### 9.7 State

Single `useProductFormState` hook. Shape mirrors the backend write payload (`types/product.ts#ProductPayload`), so submit is `api.saveProduct(state)` with no shaping.

## 10. Batch CSV upload

Lives at `/products/batch`.

### 10.1 CSV format (dashboard-defined)

One row per **variant**. Product-level fields fill only the first row of a product; continuation rows share the `name` and leave product-level fields blank.

Columns (in order):

```
name, brand, category, collection, fabric, description,
retail_price, rent_price,
size, colour, quantity, location,
image_urls, status
```

- `image_urls` is pipe-separated: `https://a.jpg|https://b.jpg|https://c.jpg`.
- `size`, `colour`, `quantity`, `location` are per-variant.
- `retail_price` / `rent_price` are plain numbers (`27000`, not `₹27,000`). Backend multiplies by 100 for paise storage. `rent_price` may be blank.
- `status` defaults to `draft` if blank.

A downloadable `dashboard-template.csv` ships in `web-dashboard/public/` with a header row and one worked example (a 6-size Saphed-style product with 3 image URLs).

### 10.2 Flow

1. **Upload + parse (client).** Dropzone accepts `.csv`. Parse with `papaparse` in the browser — no server round trip yet.
2. **Group into products.** Walk rows; group consecutive rows sharing `name` with blank product-level fields into one `ParsedProduct` with multiple variants.
3. **Preview table.** Render each `ParsedProduct` as an expandable row: name, brand, # variants, # image URLs, validation status. Expand to see variants. Invalid rows show inline Zod errors. All validation runs client-side first — nothing is sent until it passes.
4. **Import.** Enabled only when 0 errors. `POST /api/admin/products/batch` with `{ products: ParsedProduct[] }`.
5. **Backend batch route.** Zod-validates the whole payload. For each product: insert `products` row → bulk-insert variants → kick off image imports (sequential per product, parallel across products with concurrency cap 3). Each product is wrapped in a transaction so partial failures leave no orphans. Returns `[{ index, status: 'ok' | 'error', product_id?, error? }]`.
6. **Results table.** Per-row outcome with retry for failed rows. Successful rows link to `/products/:id`.

### 10.3 Limits

- Hard cap 200 products per upload. Bigger files get rejected at parse time with a "split into batches of 200" message.
- Batch upload does **not** support file-based images — URLs only. File uploads stay in the manual flow.
- Draft products created via batch still need `name` and `retail_price` — same gate as the manual form.

## 11. Product list view

Lives at `/products`. Default landing for `/`.

### 11.1 Layout

Full-width table. Filters above, pagination below.

**Header row:**
- Left: search input (name/brand), `[brand]`, `[category]`, `[status: all|draft|published]` filters.
- Right: `[New product]`, `[Batch upload]` buttons.

### 11.2 Table columns

| | Image | Name | Brand | Category | Variants | In stock | Images | Status | Updated | … |
|---|---|---|---|---|---|---|---|---|---|---|
| checkbox | thumb (first image) | | | | `#count` | `SUM(quantity)` | `#count` | draft/published pill | relative time | kebab menu |

- Leftmost column: checkbox. Header checkbox = select-all on current page.
- Clicking outside the checkbox opens `/products/:id`.
- Kebab menu actions: `Edit`, `Preview`, `Duplicate`, `Delete`.
- Column headers sortable. Default sort: `updated_at DESC`.

### 11.3 Bulk action bar

When ≥1 row selected, a sticky bar shows:

- `[N selected]` `[Clear]`
- `[Delete]` (confirmation modal) → `POST /api/admin/products/bulk-delete`
- `[Change status → draft / published]` → `POST /api/admin/products/bulk-status`
- `[Export selected as CSV]` → downloads the dashboard CSV template format pre-populated with selected products

### 11.4 Duplicate action

Copies product fields + variants into a new product with `name: "{original} (copy)"` and `status: draft`. **Images are not copied by default.** A checkbox in the duplicate modal opts into image copying (which creates new storage objects, not shared rows).

### 11.5 Pagination

Offset-based, 25 / 50 / 100 per page. Sufficient for the expected low-thousands catalog size.

## 12. Deferred auth

When auth is added later:

1. Implement a real `adminMiddleware` that either checks a role on `profiles` or checks a shared secret header.
2. Drop the no-op stub in `web-backend/src/middleware/admin.middleware.ts`.
3. Enable RLS on `products`, `product_variants`, `product_images`. Uncomment the policy stubs in the migration.
4. Add login UI to the dashboard (can reuse the frontend's auth components).
5. Update CORS to allow credentials if cookies are used.

None of this requires schema or API changes — the middleware is the only choke point.

## 13. Subagent task split

To protect the main conversation's token budget, implementation is delivered as **9 discrete task files** at `web-dashboard/docs/tasks/NN-short-name.md`. Each file is self-contained: a fresh Claude Code instance can pick it up without this conversation's context.

### 13.1 Task list

| # | File | Depends on | Scope |
|---|---|---|---|
| 1 | `01-backend-foundation.md` | — | Migration `002_products.sql`, storage bucket SQL + fallback script, `admin.middleware.ts` no-op stub, CORS update, env var additions. |
| 2 | `02-backend-product-crud.md` | 1 | `POST/GET/PATCH/DELETE /api/admin/products[/:id]`, Zod schemas, variant replacement on PATCH, bulk delete/status routes. |
| 3 | `03-backend-image-service.md` | 1 | `image-import.service.ts` + `POST .../:id/images/import` (URLs) + `POST .../:id/images/upload` (multipart) + `DELETE .../images/:imageId`. SSRF guards, content-type + size validation. |
| 4 | `04-backend-batch-suggestions.md` | 2, 3 | `POST /api/admin/products/batch` + `GET /api/admin/suggestions`. |
| 5 | `05-dashboard-scaffold.md` | — | Next.js 16 app scaffold, Tailwind v4, design tokens copied from frontend, layout shell with sidebar, `lib/api.ts` (with stubbed calls OK initially), `lib/price.ts`, `types/product.ts`. |
| 6 | `06-dashboard-form.md` | 5 | `ProductForm`, `VariantEditor`, `AutocompleteInput`, `useProductFormState`, `useAutocomplete`. Mounts at `/products/new`. |
| 7 | `07-dashboard-images.md` | 5, 6 | `ImageImporter` (URL + upload modes), wired into `ProductForm`. Preview-before-upload. |
| 8 | `08-dashboard-preview.md` | 5 | `ProductHeroPreview` (prop-drive the frontend hero), `CareSection` (copy), `PreviewPane`, `adapter.ts`. |
| 9 | `09-dashboard-list-batch.md` | 5, 6, 7, 8 | `/products` list with bulk actions, `/products/:id` edit, `/products/:id/preview` standalone, `/products/batch` CSV upload. Replaces stubbed API calls with real ones. |

### 13.2 Parallelism

- After task 1: tasks 2 and 3 can run in parallel. Then task 4 after 2+3.
- After task 5: task 6 first, then 7 and 8 in parallel. Task 9 last.

### 13.3 Task file anatomy

Each file contains:

- **Header.** "You are picking up task N of 9 for the StyleSupply product dashboard. Don't read the whole repo — below is all the context you need."
- **Working directory and repo layout.**
- **Relevant schema + API snippets** copy-pasted from this spec. No outward links.
- **Coding conventions.** TypeScript strict, Zod validation, no `any`, error format, ESM `.js` imports in backend, frontend design tokens.
- **Files to create/edit** with full absolute paths.
- **Commands to run** (install, lint, type-check).
- **Acceptance criteria (two tiers).** See §13.5 below.
- **Do NOT list.** Don't commit, don't touch files outside listed paths, don't modify frontend, don't skip Zod validation, don't try to run `npm run dev` unless explicitly told to, don't require env vars.
- **Body.** Step-by-step implementation.
- **Footer.** "When done, reply with: files created/modified + tier-1 output."

### 13.4 Main-session cost

The main conversation writes only:
1. This spec.
2. The implementation plan (via `writing-plans` skill).
3. Task file `01-backend-foundation.md` in full as the template for tasks 2–9.

Tasks 2–9 are then produced one at a time by **fresh Claude Code instances**. Each fresh instance reads the spec + `01-backend-foundation.md` as a template and generates its own task file for its assigned scope before executing. This keeps the main conversation lean — only the spec, plan, and one template get written here.

### 13.5 Two-tier acceptance criteria

Every task file defines success in two tiers. This is a hard rule — no task is allowed to require a live Supabase connection to be considered "done" by its fresh CC instance.

**Tier 1 — Code-only (mandatory, gating):**

The fresh CC instance must reach this gate before reporting completion. No env vars, no running services, no network calls.

- For `web-backend/` tasks:
  - `cd web-backend && npm run build` passes (compiles via `tsc`)
  - `cd web-backend && npm run lint` passes
  - Every file listed in the task exists with the expected structure (checked by `ls` / `grep` for key exports)
  - Zod schemas export cleanly and match the payload shapes in the spec
- For `web-dashboard/` tasks:
  - `cd web-dashboard && npx tsc --noEmit` passes
  - `cd web-dashboard && npm run lint` passes
  - `cd web-dashboard && npm run build` passes (Next.js production build — runs without API round-trips because pages are statically compiled or dynamic-rendered from client state)
  - Every file listed in the task exists
- Stubs are explicitly allowed: if a component or route depends on a later task's output, stub it with a typed placeholder and a `// stub: replaces in task NN` comment. `tsc` still passes.

**Tier 2 — Runtime verification (deferred to the user):**

Listed in the task file so the user knows what to run once env vars are configured. Tasks **must not** block on these.

- Migration runs successfully in Supabase SQL Editor.
- Storage bucket creation script runs successfully.
- `npm run dev` starts the server without crashing on env parsing.
- Specific `curl` commands return expected status codes and payloads.
- Dashboard `/products/new` loads, the form renders, preview updates on keystroke.

**How env vars are handled in code:**

- Backend: `src/config/env.ts` stays as-is (uses `envSchema.parse(process.env)` which throws at startup). Tasks do not modify this to allow missing vars — that would be papering over a runtime concern.
- Dashboard: `src/lib/api.ts` reads `process.env.NEXT_PUBLIC_API_BASE_URL` with a safe default of `http://localhost:3001`. If the env var is missing at runtime, the default kicks in. `tsc` and `build` pass with or without it.
- Neither codebase imports `dotenv/config` in test or build contexts. The existing backend imports `dotenv/config` only in `src/index.ts`, which is the server entry — not executed during `npm run build`.

**What tier-1 cannot catch (and that's OK):**

- Wrong Supabase table/column names (caught at tier 2)
- Supabase RLS blocking a write (N/A since RLS is off)
- Image fetch SSRF edge cases against real hosts (manual tier-2 testing)
- Race conditions in batch imports (load-test at tier 2)

The user accepts that tier-1 "done" tasks may still have tier-2 bugs. The trade-off is cheap parallel codegen across fresh CC instances with zero env setup friction during the build phase.

## 14. Open items

None at spec time. All design decisions resolved in brainstorming.

## 15. Appendix — CSV field mapping

For reference, this is how the original brand CSVs map to the schema:

| CSV header | Table.column |
|---|---|
| `Product` | `products.name` |
| `Price` | `products.retail_price_minor` (×100) |
| `Sizes Available` | `product_variants.size` |
| `Colour` | `product_variants.colour` |
| `Quantity` | `product_variants.quantity` |
| `Location` | `product_variants.location` |
| `Category` | `products.category` |
| `Collection` | `products.collection` |
| `Fabric/Material` | `products.fabric` |
| `Description and Details` | `products.description` |
| *(brand)* | `products.brand` — implicit from CSV file name |
| *(rent price)* | `products.rent_price_minor` — not in original CSVs, required for frontend parity |
| *(image URLs)* | `product_images.source_url` — not in original CSVs, entered in the dashboard |

The brand CSVs are **reference only** for field discovery. The dashboard's own CSV template (§10.1) is the canonical batch upload format.
