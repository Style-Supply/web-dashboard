# Task 4 of 9 — Backend Batch Import + Suggestions

You are picking up **task 4 of 9**. No prior context — everything is in this file and §2.

**Dependencies:** Tasks 1, 2, 3 must have passed their tier-1 gates. You insert routes into `admin-products.routes.ts` at the `---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----` marker and call `importFromUrl` from the service task 3 created.

---

## 0. What you are building

Two backend routes:
1. `POST /api/admin/products/batch` — accepts up to 200 parsed products from the dashboard CSV upload flow, transactionally inserts product + variants per row and fires `importFromUrl` sequentially for each image URL (concurrency cap 3 across products).
2. `GET /api/admin/suggestions` — field-scoped autocomplete (`brand|category|collection|fabric|colour|location`). Whitelisted field enum, prefix query, distinct values, limit 10.

## 1. Working directory

Primary: `/Users/harsh/Desktop/style_supply/web-backend/`

## 2. Reference documents

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — read **§5.5** (batch route contract), **§9.3** (autocomplete field list), **§10** (batch flow semantics, error handling per-row).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — "Task 4" section.
3. **Task 1 template:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/01-backend-foundation.md` — §3/§9/§13.
4. **Task 2 + 3 output:** `/Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts` — your insertion target.
5. **Task 3 service:** `/Users/harsh/Desktop/style_supply/web-backend/src/services/image-import.service.ts` — you call `importFromUrl`.

## 3. First action: write this task file if missing

If `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/04-backend-batch-suggestions.md` doesn't exist, write it.

## 4. Files you will create or modify

### Modify
1. `web-backend/src/routes/admin-products.routes.ts` — append Zod schemas to Section A; append two route handlers at the `---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----` marker.

### Create
*(none — all work lands in the existing routes file)*

**DO NOT touch:** anything created by tasks 1–3 except the routes file. No new files. No `package.json` changes. No `web-frontend/` or `web-dashboard/src/`.

## 5. Conventions

Match task 1 §3 / §9 and the existing style of `admin-products.routes.ts`. Never interpolate user input into SQL column names — whitelist via Zod enum.

## 6. Contract (authoritative)

### `POST /api/admin/products/batch`

Body:
```ts
{ products: ParsedProduct[] }   // 1..200
```
Where `ParsedProduct` (Zod):
```ts
const ParsedProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  retail_price_minor: z.number().int().nonnegative(),
  rent_price_minor: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().default('INR'),
  category: z.string().optional().nullable(),
  collection: z.string().optional().nullable(),
  fabric: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['draft','published']).default('draft'),
  variants: z.array(z.object({
    size: z.string().min(1),
    colour: z.string().optional().nullable(),
    quantity: z.number().int().nonnegative(),
    location: z.string().optional().nullable(),
  })).min(1),
  image_urls: z.array(z.string().url()).default([]),
});

const BatchImportBody = z.object({ products: z.array(ParsedProductSchema).min(1).max(200) });
```

Handler semantics (per spec §10):
- Zod-validate the whole payload. On failure return 400 with the first issue's path.
- For each product (indexed):
  1. Insert the `products` row.
  2. Bulk-insert `product_variants`.
  3. For each URL in `image_urls`, call `importFromUrl(productId, url)` **sequentially per product**. Collect failures into that product's result but do NOT fail the product — still report `status: 'ok'` as long as product + variants landed.
  4. If any of steps 1–2 throw, mark the product `status: 'error'` and best-effort rollback (delete the product row if it was created — FK cascade clears variants).
- Concurrency: process **up to 3 products in parallel** (simple promise-pool; do not use a library).
- Response `200` with `BatchImportResult`:
  ```ts
  type BatchImportResult = Array<{
    index: number;
    status: 'ok' | 'error';
    product_id?: string;
    error?: string;
    image_failures?: { url: string; reason: string }[];
  }>;
  ```

### `GET /api/admin/suggestions`

Query:
```ts
const SuggestionsQuery = z.object({
  field: z.enum(['brand','category','collection','fabric','colour','location']),
  q: z.string().default(''),
});
```

Behavior:
- For `brand|category|collection|fabric`: query `products` table distinct on field where field ILIKE `${q}%`, limit 10, order by field asc. Skip null/empty.
- For `colour|location`: query `product_variants` with same pattern.
- Response: `{ values: string[] }`.
- **Column name is whitelisted via the Zod enum** — you may use a small switch statement mapping each enum value to a hardcoded `.from(...).select(col)` call. **Never** build a dynamic column string from the raw query param.

## 7. Step-by-step

1. Read `admin-products.routes.ts`. Confirm `---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----` marker is present and Section A exists.
2. Append `ParsedProductSchema`, `BatchImportBody`, `SuggestionsQuery` to Section A.
3. Import `importFromUrl` from `../services/image-import.service.js` at the top of the file (if task 3 didn't already).
4. Implement a private `runWithPoolLimit<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]>` helper near the bottom of the file (above `export default router;`), or inline in the handler.
5. Add the two route handlers at the marker. Leave the marker comment line intact.
6. Run tier-1 gate.

## 8. Do NOT

- ❌ No `git commit` / `git push`.
- ❌ Do not touch the CRUD, bulk, or image routes.
- ❌ Do not modify `image-import.service.ts`.
- ❌ Do not add dependencies.
- ❌ Do not build column names from user input — always use the whitelisted enum + switch.
- ❌ Do not use `any`.
- ❌ Do not allow more than 3 products in parallel.
- ❌ Do not `npm run dev`.

## 9. Tier-1 gate (MANDATORY)

```bash
cd /Users/harsh/Desktop/style_supply/web-backend
npm run build
npm run lint
```
Both pass. Then:
```bash
grep -n "'/batch'\|'/suggestions'" /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
grep -n 'ParsedProductSchema\|BatchImportBody\|SuggestionsQuery' /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
grep -n 'IMAGE ROUTES (task 3' /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
```
All must match. The last grep confirms you didn't overwrite task 3's section.

## 10. Tier-2 verification (DEFERRED)

```bash
curl 'http://localhost:3001/api/admin/suggestions?field=brand&q=bao'
# Expect 200 { values: ["Baobab", ...] }

curl -X POST http://localhost:3001/api/admin/products/batch \
  -H 'Content-Type: application/json' \
  -d '{"products":[{"name":"A","brand":"X","retail_price_minor":1000,"variants":[{"size":"S","quantity":1}]}]}'
# Expect 200 [{ index:0, status:"ok", product_id:"..." }]
```

## 11. Completion report format

```
## Task 4 — Backend Batch + Suggestions — COMPLETE

### Files modified
- web-backend/src/routes/admin-products.routes.ts

### Tier-1 gate output
<npm run build + lint output>

### Marker preservation
<grep output for IMAGE ROUTES marker still present>

### Tier-2 steps (deferred)
<copy §10>

### Deviations
<list or "None.">

### Blockers
<list or "None.">
```
