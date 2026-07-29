# Task 7 of 9 — Dashboard Image Importer

You are picking up **task 7 of 9**. No prior context. Everything is in this file and §2.

**Dependencies:** Task 5 (scaffold) AND Task 6 (form) must have passed tier-1. You replace task 6's `ImageImporter.tsx` stub with the real component, wire it into the form, and extend `api.ts` with image endpoints.

---

## 0. What you are building

Full `ImageImporter` UI:
- **URL mode**: textarea (one URL per line) + "Import from URLs" button → calls `POST /api/admin/products/:id/images/import`.
- **Upload mode**: drag-and-drop + "Choose files" → calls `POST /api/admin/products/:id/images/upload` (multipart).
- **Image grid**: cards with drag-to-reorder (updates `sort_order`), editable `alt` text, delete button, per-item status overlays.
- On `/products/new` **before the product is saved**, show a "Save draft first" banner instead of the importer — product-id is required by the backend.

## 1. Working directory

Primary: `/Users/harsh/Desktop/style_supply/web-dashboard/`

## 2. Reference documents

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — **§6** (image pipeline — relevant to what the backend accepts and returns), **§9.5** (importer UX).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — "Task 7".
3. **Task 5 output:** `src/lib/api.ts`, `src/types/product.ts`.
4. **Task 6 output:** `src/components/product-form/ImageImporter.tsx` (stub you replace), `src/components/product-form/ProductForm.tsx` (confirm how the stub is imported — keep the import path the same).

## 3. First action: write this task file if missing

Path: `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/07-dashboard-images.md`.

## 4. Files you will create or modify

### Create
1. `src/lib/url-check.ts` — client-side shape validation only (`isLikelyHttpUrl(str: string): boolean`). Backend does real SSRF.

### Replace (file exists as stub from task 6)
2. `src/components/product-form/ImageImporter.tsx` — full component

### Modify
3. `src/lib/api.ts` — add/flesh out `importImagesFromUrls(productId, urls)`, `uploadImages(productId, files)`, `deleteImage(imageId)`, `reorderImages(productId, imageIds)` (reorder is a client-side operation that PATCHes each image row — but the backend currently has no reorder endpoint, so for v1 persist order by calling `PATCH /api/admin/products/:id` with a refreshed image list via a dedicated small endpoint. **If task 3/4 did not expose a reorder endpoint, implement `reorderImages` as a no-op that only updates local state and leave a TODO in the function body.** Do not add a new backend route.)

**DO NOT:**
- Touch `ProductForm.tsx` beyond minor: if `ProductForm` already imports `ImageImporter` from its existing path, no change needed. If not, add the import and render it in the correct slot per spec §9.5.
- Touch any other task-6 file.
- Touch task-8 / task-9 files.
- Touch `web-backend/` or `web-frontend/`.

## 5. Conventions

- `'use client'`. No form library. No drag-and-drop library — use native HTML5 DnD (`onDragStart`, `onDragOver`, `onDrop`) for reorder. For file drop, native drop events on a `<div>` + hidden `<input type="file" multiple accept="image/*">`.
- Fetch via `request` from `api.ts`. For multipart upload, bypass `request` (it forces `Content-Type: application/json`) — use `fetch(\`${API_BASE}/api/admin/products/${id}/images/upload\`, { method: 'POST', body: formData })` directly. Do not set `Content-Type` manually for multipart.
- Per-item status state: `'pending' | 'uploading' | 'done' | 'error'`. Render overlay icons with Tailwind only — no icon library.
- Keep the `ImageImporter` component a single file. If it grows past ~350 lines, it's fine — do not split into sub-components unless it genuinely reduces duplication.

## 6. Contract

### Props

```ts
interface ImageImporterProps {
  productId: string | null;  // null on /products/new before save
  images: ProductImage[];
  onImagesChange: (next: ProductImage[]) => void;
}
```

### Behavior

- If `productId === null`: render a neutral banner: "Save the draft first to attach images." and disable all inputs.
- Otherwise: render a tabbed or segmented URL / Upload toggle at the top, and the image grid below.
- On URL import:
  ```ts
  const { imported, failed } = await importImagesFromUrls(productId, urls);
  onImagesChange([...images, ...imported]);
  // Display failed URLs inline with their reason.
  ```
- On file upload: same pattern with `uploadImages(productId, files)`.
- On delete: `deleteImage(imageId)` then `onImagesChange(images.filter(i => i.id !== imageId))`.
- On reorder: local reorder + `reorderImages(productId, newOrderIds)` (no-op today — leave a TODO).
- Alt-text edit: debounce 500ms, `PATCH /api/admin/products/:id` with the updated images array, OR — **since task 2's PATCH does not touch images** — mutate locally only and leave a TODO noting that persistent alt-text needs a future backend route. Prefer the second approach; do not attempt to add backend routes here.

## 7. Step-by-step

1. Create `src/lib/url-check.ts`.
2. Extend `src/lib/api.ts` with the four image functions.
3. Replace `ImageImporter.tsx` body.
4. Verify `ProductForm.tsx` still compiles (the import path doesn't change).
5. Run tier-1 gate.

## 8. Do NOT

- ❌ `git commit` / `git push`.
- ❌ Add dependencies (no `react-dropzone`, no `react-dnd`).
- ❌ Add backend routes or modify `web-backend/`.
- ❌ Modify `ProductForm.tsx` beyond verifying the import.
- ❌ Touch task 8 / task 9 files.
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
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/lib/url-check.ts
grep -n "importImagesFromUrls\|uploadImages\|deleteImage\|reorderImages" /Users/harsh/Desktop/style_supply/web-dashboard/src/lib/api.ts
grep -c "task 7" /Users/harsh/Desktop/style_supply/web-dashboard/src/components/product-form/ImageImporter.tsx
# Last grep should be 0 — stub comment should be gone.
```

## 10. Tier-2 verification (DEFERRED)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard && npm run dev
# On /products/:id:
# 1. Paste URL → Import → cards appear.
# 2. Drag card → reorder updates locally.
# 3. Drop file → upload succeeds.
# 4. Delete → card disappears + DB row gone.
```

## 11. Completion report format

```
## Task 7 — Dashboard Image Importer — COMPLETE

### Files created
- src/lib/url-check.ts

### Files replaced
- src/components/product-form/ImageImporter.tsx

### Files modified
- src/lib/api.ts

### Tier-1 gate output
<tsc + lint + build>

### Tier-2 steps (deferred)
<copy §10>

### Deviations
<list or "None.">

### Known TODOs intentionally left
- reorderImages: no backend route (document)
- alt-text persistence: not wired to backend (document)

### Blockers for task 9
<list or "None.">
```
