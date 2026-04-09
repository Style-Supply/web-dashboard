# Task 3 of 9 — Backend Image Service + Routes

You are picking up **task 3 of 9** for the StyleSupply product dashboard. No prior context — everything you need is in this file and §2 references.

**Dependencies:** Task 1 (schema, bucket, middleware) AND Task 2 (`admin-products.routes.ts` with `---- IMAGE ROUTES (task 3 inserts below) ----` marker) must have passed their tier-1 gates before you run.

---

## 0. What you are building

A Supabase Storage image pipeline for product images:
1. `image-import.service.ts` — server-side functions: `importFromUrl`, `uploadFromBuffer`, `deleteImage`, `deleteAllImagesForProduct`. URL imports must include SSRF guards, timeout, content-type + size validation.
2. Three HTTP routes inserted into task 2's `admin-products.routes.ts` at the `---- IMAGE ROUTES (task 3 inserts below) ----` marker: URL import, multipart upload (multer, max 10 files), single delete.
3. Wire `deleteAllImagesForProduct` into task 2's `DELETE /:id` and `POST /bulk-delete` handlers (at the `// TODO task 3` comments task 2 left).
4. Add `multer` + `@types/multer` to `web-backend/package.json`.

## 1. Working directory

Primary: `/Users/harsh/Desktop/style_supply/web-backend/`

```
/Users/harsh/Desktop/style_supply/
├── web-backend/     ← you edit here
├── web-dashboard/   ← write your task file here, do not touch src/
└── web-frontend/    ← do not touch
```

## 2. Reference documents

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — read **§4.3** (product_images table) and **§6** (image flow: SSRF rules, content-type allowlist, size limit, Storage path convention).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — "Task 3" section.
3. **Task 1 template:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/01-backend-foundation.md` — §3 conventions, §9 coding standards, §13 report format.
4. **Task 2 output:** `/Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts` — your insertion target. Read it end-to-end before editing.

## 3. Your first action: write the task file

If `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/03-backend-image-service.md` does not already exist, write it (this file). If it exists (main session pre-wrote it), execute §7 directly.

## 4. Files you will create or modify

### Create
1. `web-backend/src/services/image-import.service.ts`

### Modify
2. `web-backend/src/routes/admin-products.routes.ts` — append image routes at the marker; append image Zod schemas to Section A; insert `deleteAllImagesForProduct(...)` calls at the `// TODO task 3` comments in the DELETE and bulk-delete handlers.
3. `web-backend/package.json` — add `multer` and `@types/multer`.

**DO NOT touch:**
- Anything task 1 or task 2 created except the two files above.
- `web-backend/src/index.ts` (already mounts the router from task 2).
- The `---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----` marker or anything under it.
- `web-frontend/` or `web-dashboard/src/`.

## 5. Conventions

Match task 1 §3 / §9 and task 2's existing style in `admin-products.routes.ts` exactly. ESM `.js` imports, no `any`, inline Zod, `{ error: { code, message } }` shape, `supabaseAdmin` for all DB + Storage access.

## 6. Contract (spec §6 excerpt — authoritative)

### Service — `image-import.service.ts`

```ts
export interface ImportResult { id: string; product_id: string; storage_path: string; public_url: string; source_url: string | null; alt: string | null; sort_order: number; }
export interface FailedImport { url: string; reason: string; }

export async function importFromUrl(productId: string, url: string): Promise<ImportResult>;
export async function uploadFromBuffer(productId: string, buffer: Buffer, contentType: string, originalName?: string): Promise<ImportResult>;
export async function deleteImage(imageId: string): Promise<void>;
export async function deleteAllImagesForProduct(productId: string): Promise<void>;
```

**SSRF guards for `importFromUrl`** (spec §6):
- Only `http:` or `https:` protocol.
- Reject hostnames resolving to private ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`, `fe80::/10`. Use `dns.promises.lookup` to resolve; reject before `fetch`.
- Reject `localhost`, `metadata.google.internal`, `169.254.169.254`.
- `fetch` with 15-second abort timeout (`AbortController` + `setTimeout`).
- Validate response `content-type` is one of `image/jpeg`, `image/png`, `image/webp`. Reject otherwise.
- Enforce max body size 10 MB — stream into a bounded buffer, reject on overflow.

**Storage write:**
- Path template: `${productId}/${crypto.randomUUID()}.${ext}` where `ext` derives from content-type (`jpeg → jpg`, `png → png`, `webp → webp`).
- Upload to bucket `product-images` via `supabaseAdmin.storage.from('product-images').upload(path, buffer, { contentType, upsert: false })`.
- Fetch public URL via `.getPublicUrl(path).data.publicUrl`.
- Insert row into `product_images` with next `sort_order` (max existing + 1 for that product_id, default 0).
- Return the inserted row.

**`uploadFromBuffer`:** same validation (content-type + size) minus SSRF/DNS. Used by the multipart route.

**`deleteImage`:** fetch the row to get `storage_path`, remove from Storage via `.storage.from('product-images').remove([path])`, delete DB row. If Storage remove errors, still delete the DB row and log the orphan — do NOT fail the request.

**`deleteAllImagesForProduct`:** list all rows for `product_id`, bulk-remove their storage paths, then leave the DB cascade to the caller (caller deletes the product row afterwards).

### Routes (inserted at the marker in `admin-products.routes.ts`)

```ts
// ---- IMAGE ROUTES (task 3 inserts below) ----

// POST /api/admin/products/:id/images/import
//   body: { urls: string[] }  (zod: 1..20 URLs, each z.string().url())
//   response: { imported: ImportResult[], failed: FailedImport[] }
//   Calls importFromUrl(productId, url) for each URL sequentially. Catches per-URL errors into `failed`.

// POST /api/admin/products/:id/images/upload
//   multipart/form-data, field name: "files", max 10, max 10MB each
//   Uses multer.memoryStorage(). For each file, calls uploadFromBuffer.
//   Response: { imported: ImportResult[], failed: FailedImport[] }

// DELETE /api/admin/products/images/:imageId
//   Calls deleteImage. Returns 204.
```

Append to Section A (Validation schemas):
```ts
const ImportFromUrlBody = z.object({ urls: z.array(z.string().url()).min(1).max(20) });
```

### Hooking the DELETE cascades (task 2's TODOs)

In task 2's `DELETE /:id` handler, at the `// TODO task 3:` comment, insert a call to `deleteAllImagesForProduct(id)` **before** the DB delete. Same for `POST /bulk-delete` — iterate over `ids` and call the helper per id before bulk-deleting. Remove the `// TODO task 3:` comment once wired.

## 7. Step-by-step

1. **Read** task 2's `admin-products.routes.ts` fully. Confirm the two section markers are present and the `// TODO task 3:` comments exist in DELETE and bulk-delete.
2. **Create** `src/services/image-import.service.ts` with the four functions per §6. Keep SSRF logic in a private helper `assertPublicHttpUrl(url: string)`.
3. **Add** `multer` and `@types/multer` to `package.json` `dependencies` and `devDependencies` respectively (use the latest stable — if unsure, `multer@^1.4.5-lts.1`, `@types/multer@^1.4.11`). Run `npm install`.
4. **Edit** `admin-products.routes.ts`:
   - Add `import multer from 'multer';` and service imports at top.
   - Add `const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 10 } });` near the top of Section B or just before the image routes block.
   - Append `ImportFromUrlBody` to Section A.
   - Insert the three image route handlers at the `---- IMAGE ROUTES (task 3 inserts below) ----` marker. Leave the marker line intact (comment stays — it's a permanent anchor).
   - Wire `deleteAllImagesForProduct` into DELETE and bulk-delete; remove the two `// TODO task 3:` comments.
5. **Run** tier-1 gate (§9).

## 8. Do NOT

- ❌ Do not `git commit` / `git push`.
- ❌ Do not touch the `---- BATCH + SUGGESTIONS ROUTES (task 4 inserts below) ----` marker or anything below it.
- ❌ Do not modify the Zod schemas or CRUD handlers from task 2 beyond wiring `deleteAllImagesForProduct` and removing the two TODO comments.
- ❌ Do not import `@supabase/supabase-js` directly — use `supabaseAdmin` from `../config/supabase.js`.
- ❌ Do not skip SSRF checks. The DNS resolve step is mandatory.
- ❌ Do not use `any`. `unknown` + narrowing.
- ❌ Do not store uploaded files to disk — `multer.memoryStorage()` only.
- ❌ Do not `npm run dev`.

## 9. Tier-1 gate (MANDATORY)

```bash
cd /Users/harsh/Desktop/style_supply/web-backend
npm install
npm run build
npm run lint
```
All three must pass. Then:
```bash
ls /Users/harsh/Desktop/style_supply/web-backend/src/services/image-import.service.ts
grep -n 'importFromUrl\|uploadFromBuffer\|deleteImage\|deleteAllImagesForProduct' /Users/harsh/Desktop/style_supply/web-backend/src/services/image-import.service.ts
grep -n 'multer' /Users/harsh/Desktop/style_supply/web-backend/package.json
grep -n 'images/import\|images/upload\|images/:imageId' /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
grep -n 'BATCH + SUGGESTIONS ROUTES (task 4' /Users/harsh/Desktop/style_supply/web-backend/src/routes/admin-products.routes.ts
```
Every grep must match. The last grep confirms you did not delete task 4's marker.

## 10. Tier-2 verification (DEFERRED)

```bash
# With env + running server + a product id from task 2:
curl -X POST http://localhost:3001/api/admin/products/<id>/images/import \
  -H 'Content-Type: application/json' \
  -d '{"urls":["https://picsum.photos/400/600"]}'
# Expect 200 with { imported: [{...}], failed: [] }

curl -X POST http://localhost:3001/api/admin/products/<id>/images/upload \
  -F "files=@/path/to/test.jpg"
# Expect 200 with { imported: [{...}], failed: [] }
```

## 11. Completion report format

```
## Task 3 — Backend Image Service + Routes — COMPLETE

### Files created
- web-backend/src/services/image-import.service.ts

### Files modified
- web-backend/src/routes/admin-products.routes.ts
- web-backend/package.json

### Tier-1 gate output
<npm install + build + lint output>

### Marker preservation
<grep output proving task 4's marker is still present>

### Tier-2 steps for the user (deferred)
<copy §10>

### Deviations
<list or "None.">

### Blockers for task 4
<list or "None.">
```
