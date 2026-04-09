# Task 2 of 9 — Backend Product CRUD + Bulk Routes

You are picking up **task 2 of 9** for the StyleSupply product dashboard. You have **no prior context** on this conversation. Everything you need is in this file and the three reference documents in §2.

---

## 0. What you are building

Task 1 created the `products` / `product_variants` / `product_images` schema, `adminMiddleware` stub, CORS update, and a storage bucket. **You are now adding the CRUD + bulk HTTP routes** that sit on top of it: `GET/POST/PATCH/DELETE /api/admin/products`, list with filters, and `bulk-delete` / `bulk-status`. You are also creating the **structural skeleton** of `admin-products.routes.ts` — tasks 3 and 4 will append image and batch routes into the section markers you leave.

You do NOT write image routes, batch routes, multer, or any service file.

## 1. Working directory

```
/Users/harsh/Desktop/style_supply/
├── web-backend/     ← you edit here
├── web-dashboard/   ← you write your task file here, do not touch src/
└── web-frontend/    ← do not touch
```

Primary working directory: `/Users/harsh/Desktop/style_supply/web-backend/`

## 2. Reference documents — read these first

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — read **§4** (schema, authoritative column list), **§5** (API routes — you implement §5.1 CRUD, §5.3 bulk; stub the section headers for §5.4 images and §5.5 batch/suggestions), and **§11** (list query contract).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — read "Task 2: Backend product CRUD + bulk routes" and the "File Structure" section.
3. **Task 1 template:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/01-backend-foundation.md` — read §3 (coding conventions), §8 (Do NOT list), §9 (coding standards), §13 (completion report format). **You mirror this shape in your own task file (see §3 below).**

Do not read the whole spec or the frontend source.

## 3. Your first action: write the task file

**Before writing any code**, write this file's sibling at `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/02-backend-product-crud.md`. That file IS what you are reading now — if you were dispatched with only this prompt, copy its structure and commit your reading of the spec sections into it as a permanent record. If the file already exists on disk (because the main session pre-wrote it), you do NOT need to rewrite it — just execute §7.

## 4. Files you will create or modify

### Create
1. `web-backend/src/routes/admin-products.routes.ts` — full skeleton with sections A, B, C, D (see §7)
2. `web-backend/src/types/admin-products.types.ts` — TypeScript interfaces (`Product`, `ProductVariant`, `ProductImage`, `ProductListQuery`, `ProductListResponse`, etc.) matching spec §4 column-for-column

### Modify
3. `web-backend/src/index.ts` — mount the router at `/api/admin/products`, behind `adminMiddleware`

**DO NOT touch:**
- `web-backend/src/services/` (task 3 creates `image-import.service.ts`)
- `web-backend/package.json` (task 3 adds multer)
- Anything task 1 created (migrations, middleware, env)
- `web-frontend/` or `web-dashboard/src/`

## 5. Conventions (same as task 1)

Match task 1 §3 and §9 exactly: TypeScript strict, no `any`, ESM `.js` imports for local modules, inline Zod at top of route file, error shape `{ error: { code, message } }`, `supabaseAdmin` from `src/config/supabase.ts` for all DB access, kebab-case filenames, explicit return types on exported functions. Study `web-backend/src/routes/auth.routes.ts` for the exact existing router pattern (imports, Zod placement, error handling style) — match it.

## 6. Route contract (spec §5 excerpt — these are authoritative)

### Section B — Product CRUD

**`GET /api/admin/products`** — list with filters
- Query params (all optional): `q` (ILIKE on `name` + `brand`), `brand`, `category`, `status` (`draft|published|all`, default `all`), `sort` (`created_at|-created_at|name|-name|retail_price_minor|-retail_price_minor`, default `-created_at`), `limit` (default 50, max 200), `offset` (default 0)
- Returns `{ products: Product[], total: number }` where each `Product` includes its variants (array) and images (array, ordered by `sort_order`).
- Use `supabaseAdmin.from('products').select('*, variants:product_variants(*), images:product_images(*)')` plus filter chaining. Count via a second `.select('id', { count: 'exact', head: true })` query with identical filters.

**`GET /api/admin/products/:id`**
- 404 with `{ error: { code: 'NOT_FOUND', message: 'Product not found' } }` if missing.
- Returns the single product with variants + images.

**`POST /api/admin/products`**
- Body: `ProductPayload` (see schema below). Zod-validate.
- Insert product row, then bulk-insert variants, then bulk-insert images (if any are passed by `id` — new flow will typically pass empty images array; images are attached later by task-3 routes).
- Returns 201 with the full hydrated product.

**`PATCH /api/admin/products/:id`**
- Body: partial `ProductPayload`. Variants, if present, **replace wholesale** — delete existing variants for the product then insert the new set. Images are NOT touched by PATCH (task 3 owns image mutation).
- Returns 200 with the hydrated product.

**`DELETE /api/admin/products/:id`**
- Delete the row. Cascade drops variants + image rows automatically via FK.
- **Leave this comment at the exact line where task 3 will insert its call:**
  ```ts
  // TODO task 3: remove storage objects via deleteAllImagesForProduct(id) BEFORE the DB delete
  ```
- Returns 204.

### Section C — Bulk

**`POST /api/admin/products/bulk-delete`** — body `{ ids: string[] }`, zod min 1. Returns `{ deleted: number }`. Same TODO comment for task 3 storage cleanup as above.

**`POST /api/admin/products/bulk-status`** — body `{ ids: string[], status: 'draft'|'published' }`. Returns `{ updated: number }`.

### Zod schemas (Section A — top of file)

Define inline, in this order:
```ts
const VariantInput = z.object({
  size: z.string().min(1),
  colour: z.string().optional().nullable(),
  quantity: z.number().int().nonnegative(),
  location: z.string().optional().nullable(),
});

const ProductCreate = z.object({
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  retail_price_minor: z.number().int().nonnegative(),
  rent_price_minor: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().default('INR'),
  category: z.string().optional().nullable(),
  collection: z.string().optional().nullable(),
  fabric: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  variants: z.array(VariantInput).default([]),
});

const ProductUpdate = ProductCreate.partial();

const ListQuery = z.object({
  q: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'published', 'all']).default('all'),
  sort: z.enum(['created_at','-created_at','name','-name','retail_price_minor','-retail_price_minor']).default('-created_at'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const BulkIds = z.object({ ids: z.array(z.string().uuid()).min(1) });
const BulkStatus = BulkIds.extend({ status: z.enum(['draft', 'published']) });
```

Tasks 3 and 4 will append `ImportFromUrlBody`, `BatchImportBody`, `SuggestionsQuery`, etc. to this same section.

## 7. Step-by-step

### 7.A — Create `admin-products.routes.ts` skeleton

File: `web-backend/src/routes/admin-products.routes.ts`

Structure the file **exactly** like this so tasks 3/4 have stable insertion points:

```ts
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();
router.use(adminMiddleware);

// ============================================================
// Section A — Validation schemas
// ============================================================
// (Zod schemas from §6 go here. Tasks 3 and 4 APPEND to this section.)

// ============================================================
// Section B — Product CRUD routes
// ============================================================
// GET /, GET /:id, POST /, PATCH /:id, DELETE /:id

// ============================================================
// Section C — Bulk routes
// ============================================================
// POST /bulk-delete, POST /bulk-status

// ---- IMAGE ROUTES (task 3 inserts below) ----

// ---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----

export default router;
```

The two `---- ... ----` comment lines are **load-bearing** — tasks 3 and 4 use them as literal anchors. Do not rename, reorder, or reformat.

### 7.B — Implement handlers

Implement every handler from §6. Use `supabaseAdmin`. Wrap PATCH's "replace variants" in a best-effort sequence: delete then insert. If Supabase returns an error on any step, respond 500 with `{ error: { code: 'DB_ERROR', message: err.message } }`. For validation failures, respond 400 with `{ error: { code: 'VALIDATION_ERROR', message: issue.message } }`.

Hydration helper: write a private `hydrateProduct(id: string)` that does a single `.select('*, variants:product_variants(*), images:product_images(*)')` and returns the typed product. Call it from POST, PATCH, GET /:id.

### 7.C — Create `admin-products.types.ts`

File: `web-backend/src/types/admin-products.types.ts`

Export TypeScript interfaces that match spec §4 column-for-column:
```ts
export interface Product { id: string; name: string; brand: string | null; retail_price_minor: number; rent_price_minor: number | null; currency: string; category: string | null; collection: string | null; fabric: string | null; description: string | null; status: 'draft' | 'published'; created_at: string; updated_at: string; variants: ProductVariant[]; images: ProductImage[]; }
export interface ProductVariant { id: string; product_id: string; size: string; colour: string | null; quantity: number; location: string | null; created_at: string; }
export interface ProductImage { id: string; product_id: string; storage_path: string; public_url: string; source_url: string | null; alt: string | null; sort_order: number; created_at: string; }
```

Use these types as the return shapes of your route handlers (cast only at the Supabase boundary).

### 7.D — Mount in `index.ts`

Edit `web-backend/src/index.ts`. Add near the other `app.use('/api/...')` mounts:
```ts
import adminProductsRouter from './routes/admin-products.routes.js';
// ...
app.use('/api/admin/products', adminProductsRouter);
```

Do NOT remove or change anything else in `index.ts`.

## 8. Do NOT

- ❌ Do not `git commit` / `git push`.
- ❌ Do not create `image-import.service.ts` — task 3.
- ❌ Do not add image routes or batch routes — they go in the marked sections by tasks 3/4.
- ❌ Do not add `multer` or any dependency.
- ❌ Do not rename the `---- IMAGE ROUTES (task 3 inserts below) ----` / `---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----` markers.
- ❌ Do not enable RLS or modify `supabase.ts`.
- ❌ Do not touch `web-frontend/` or `web-dashboard/src/`.
- ❌ Do not add `any`.
- ❌ Do not `npm run dev` (blocks on port).

## 9. Tier-1 gate (MANDATORY)

```bash
cd /Users/harsh/Desktop/style_supply/web-backend
npm run build
npm run lint
```
Both must pass. Then verify files exist:
```bash
ls /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
ls /Users/harsh/Desktop/style_supply/web-backend/src/types/admin-products.types.ts
grep -n 'admin/products' /Users/harsh/Desktop/style_supply/web-backend/src/index.ts
grep -n 'IMAGE ROUTES (task 3' /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
grep -n 'BATCH + SUGGESTIONS ROUTES (task 4' /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
```
All greps must match at least once.

## 10. Tier-2 verification (DEFERRED — document, don't run)

```bash
# Requires env + migration applied from task 1:
curl -X POST http://localhost:3001/api/admin/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","brand":"Baobab","retail_price_minor":2700000,"variants":[{"size":"S","colour":"Blue","quantity":1}]}'
# Expect 201 with { id, ... }

curl 'http://localhost:3001/api/admin/products?status=all'
# Expect 200 with { products:[...], total:1 }
```

## 11. Completion report format

```
## Task 2 — Backend Product CRUD + Bulk — COMPLETE

### Files created
- web-backend/src/routes/admin-products.routes.ts
- web-backend/src/types/admin-products.types.ts

### Files modified
- web-backend/src/index.ts

### Tier-1 gate output
<paste npm run build + npm run lint output>

### Section markers verified
<paste the two grep results for IMAGE / BATCH marker lines>

### Tier-2 steps for the user (deferred)
<copy §10 verbatim>

### Deviations from the task file
<list or "None.">

### Blockers for downstream tasks (3, 4)
<list or "None.">
```
