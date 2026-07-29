# Task 1 of 9 — Backend Foundation

You are picking up **task 1 of 9** for the StyleSupply product dashboard build-out. You have **no prior context** on this conversation — everything you need is in this file and the files it points to. Don't read the whole repo.

This task is the **template** that tasks 2–9 follow. Subsequent fresh Claude Code instances will read this file as their structural pattern before writing their own task files.

---

## 0. What you are building (one paragraph)

An internal dashboard at `web-dashboard/` lets StyleSupply staff populate a Supabase product catalog. Product tables don't exist yet. This task creates the **database schema**, **storage bucket**, **admin middleware stub**, **CORS update**, and **env var additions** in the existing `web-backend/` repo. It lays the foundation for tasks 2, 3, 4 which add routes on top of it.

You will NOT write any route handlers in this task — routes come in tasks 2/3/4.

## 1. Working directory

```
/Users/harsh/Desktop/style_supply/
├── web-backend/     ← you edit here
├── web-dashboard/   ← you write the task file here (see §14), do not touch src/
└── web-frontend/    ← do not touch
```

Primary working directory: `/Users/harsh/Desktop/style_supply/web-backend/`

## 2. Reference documents

Already read these before starting — they contain all the design decisions:

- **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — read sections 4 (schema), 5.2 (cross-cutting), 12 (deferred auth). You can skip other sections.
- **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — read "Task 1: Backend foundation" section and the "File Structure" section.

Do not read the whole spec. The snippets you need are copy-pasted into §5–§11 below.

## 3. Existing backend conventions (match these exactly)

You MUST match these or `npm run build` and `npm run lint` will fail:

- **TypeScript strict mode.** No `any`. Use `unknown` and narrow with type guards.
- **ESM imports.** Every import from a local file uses `.js` extension even though the source is `.ts`:
  ```ts
  import { env } from './config/env.js';  // ✅
  import { env } from './config/env';     // ❌ will fail at build
  ```
- **Error response shape:** `{ error: { code: 'ERROR_CODE', message: 'Human readable' } }`
- **Zod validation:** inline schemas at top of route files. Look at `web-backend/src/routes/auth.routes.ts` for the exact style.
- **File names:** `kebab-case.ts`
- **Classes:** `PascalCase` · **Functions/vars:** `camelCase` · **Env vars:** `SCREAMING_SNAKE_CASE`
- **Supabase clients:** use `supabaseAdmin` from `src/config/supabase.ts` for writes (bypasses RLS). Never import `@supabase/supabase-js` directly in route/middleware files.
- **Migrations:** SQL files in `src/db/migrations/NNN_name.sql`. They are run manually in the Supabase SQL Editor — never via code.

## 4. Files you will create or modify

**Exact, no ambiguity. Do not touch any other files.**

### Create

1. `web-backend/src/middleware/admin.middleware.ts` — no-op middleware stub
2. `web-backend/src/db/migrations/002_products.sql` — schema migration
3. `web-backend/src/db/migrations/002_products.md` — short description alongside the migration
4. `web-backend/scripts/create-storage-bucket.ts` — fallback bucket creator

### Modify

5. `web-backend/.env.example` — add `DASHBOARD_URL=http://localhost:3002`
6. `web-backend/src/config/env.ts` — add `DASHBOARD_URL` to the Zod schema
7. `web-backend/src/index.ts` — extend CORS `origin` from a single string to an array that includes both `FRONTEND_URL` and `DASHBOARD_URL`

**DO NOT** touch:
- `web-backend/src/routes/` (tasks 2/3/4 will create `admin-products.routes.ts`)
- `web-backend/src/services/` (task 3 creates `image-import.service.ts`)
- Any file in `web-frontend/` or `web-dashboard/src/`
- `web-backend/package.json` (task 3 adds `multer`; not here)

## 5. Spec excerpt — Schema (§4)

Migration `web-backend/src/db/migrations/002_products.sql` creates three tables, one trigger, one storage bucket. Reuses the existing `handle_updated_at()` function from migration 001.

### 5.1 `products` table

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `name` | `text` | NO | — | |
| `brand` | `text` | YES | — | freetext, autocomplete-backed |
| `retail_price_minor` | `integer` | NO | — | MSRP in paise (₹27,000 → `2700000`) |
| `rent_price_minor` | `integer` | YES | — | optional rental price in paise |
| `currency` | `text` | NO | `'INR'` | |
| `category` | `text` | YES | — | |
| `collection` | `text` | YES | — | |
| `fabric` | `text` | YES | — | "Fabric/Material" |
| `description` | `text` | YES | — | |
| `status` | `text` | NO | `'draft'` | check: `draft` \| `published` |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | auto-updated via trigger |

### 5.2 `product_variants` table

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `product_id` | `uuid` | NO | — | FK `products(id)` `ON DELETE CASCADE` |
| `size` | `text` | NO | — | |
| `colour` | `text` | YES | — | |
| `quantity` | `integer` | NO | `0` | |
| `location` | `text` | YES | — | |
| `created_at` | `timestamptz` | NO | `now()` | |

Unique constraint on `(product_id, size, colour, location)`. Note: Postgres treats `NULL` as not-equal in unique constraints, so two rows with the same `size` and `NULL` `colour` will both be allowed. That's acceptable — the dashboard's client-side validation handles duplicate detection for the UX.

### 5.3 `product_images` table

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `product_id` | `uuid` | NO | — | FK `products(id)` `ON DELETE CASCADE` |
| `storage_path` | `text` | NO | — | e.g. `products/{product_id}/{uuid}.jpg` |
| `public_url` | `text` | NO | — | Supabase Storage public URL |
| `source_url` | `text` | YES | — | original URL fetched; `NULL` for file uploads |
| `alt` | `text` | YES | — | user-editable alt text |
| `sort_order` | `integer` | NO | `0` | |
| `created_at` | `timestamptz` | NO | `now()` | |

Index on `(product_id, sort_order)` for ordered gallery reads.

### 5.4 Storage bucket

Bucket `product-images`, public read, service-role write, max file size 10 MB, allowed MIME types `image/jpeg`, `image/png`, `image/webp`. Create via `insert into storage.buckets (...)`. If that fails at tier-2 run time, the fallback `scripts/create-storage-bucket.ts` (§11 below) creates it via the Supabase admin API.

### 5.5 Trigger

```sql
create trigger on_product_updated
  before update on public.products
  for each row execute procedure public.handle_updated_at();
```

The `handle_updated_at()` function already exists from migration `001_profiles_addresses.sql`. Do not redefine it.

### 5.6 RLS stance

**RLS stays OFF** on all three new tables for v1 (no auth — see spec §12). The migration includes commented-out policy stubs pointing at where admin/staff policies will go when auth lands. Do NOT call `alter table ... enable row level security;` — that would block the service-role client for no benefit.

## 6. Spec excerpt — Cross-cutting (§5.2)

- **`admin.middleware.ts`** — new middleware, will be applied to every `/api/admin/*` route by task 2. **No-op for v1.** Contains a clearly marked `TODO` showing exactly where to plug in a role check or shared-secret check. Zero behavioural impact until someone opts in.
- **CORS** — `src/index.ts` currently allows only `env.FRONTEND_URL`. Extend the origin option to an array that also includes `env.DASHBOARD_URL`.
- **CSRF** — skipped for `/api/admin/*` routes for v1. (Handled by task 2 at mount time — not your problem.)
- **Error format** — `{ error: { code: 'ERROR_CODE', message: 'Human readable' } }`

## 7. Step-by-step

Complete these in order. After step 7.G, run the tier-1 gate (§12).

### 7.A — Add `DASHBOARD_URL` to `.env.example`

Append to `web-backend/.env.example`:

```bash

# Dashboard (internal staff tool)
DASHBOARD_URL=http://localhost:3002
```

The leading blank line preserves the trailing-blank-line pattern of the existing file.

### 7.B — Add `DASHBOARD_URL` to env Zod schema

Edit `web-backend/src/config/env.ts`. Add `DASHBOARD_URL` right after `FRONTEND_URL`:

```ts
import { z } from 'zod';
import crypto from 'crypto';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url(),
  DASHBOARD_URL: z.string().url().default('http://localhost:3002'),
  BACKEND_URL: z.string().url().default('http://localhost:3001'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.string().transform(v => v === 'true').default('false'),
  CSRF_SECRET: z.string().default(crypto.randomBytes(32).toString('hex')),
});

export const env = envSchema.parse(process.env);
```

The `.default('http://localhost:3002')` means env-less dev still works. Production deployments should set `DASHBOARD_URL` explicitly.

### 7.C — Extend CORS in `index.ts`

Edit `web-backend/src/index.ts`. Change the CORS block from:

```ts
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
```

to:

```ts
app.use(cors({
  origin: [env.FRONTEND_URL, env.DASHBOARD_URL],
  credentials: true,
}));
```

Nothing else in `index.ts` changes. Do NOT mount any admin router here — task 2 will do that.

### 7.D — Create `admin.middleware.ts`

Create `web-backend/src/middleware/admin.middleware.ts` with this exact content:

```ts
import { Request, Response, NextFunction } from 'express';

/**
 * Admin middleware — no-op stub for v1.
 *
 * The dashboard is internal-only for now and has no auth. This middleware
 * exists as a clean hookpoint so auth can be added later without refactoring
 * every admin route.
 *
 * When auth lands (see spec §12):
 *   1. Replace the no-op body with a role check against `profiles` or a
 *      shared-secret header check.
 *   2. Enable RLS on products / product_variants / product_images.
 *   3. Uncomment the policy stubs in 002_products.sql.
 *   4. Update CORS to allow credentials if cookies are used.
 *
 * Do NOT remove this middleware — routes in admin-products.routes.ts depend
 * on this being the single choke point for admin access.
 */
export async function adminMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // TODO: auth — plug role/shared-secret check here.
  // Until then, all admin routes are unauthenticated.
  next();
}
```

**Note:** explicit `Promise<void>` return type and underscore-prefixed unused params match the project's lint config.

### 7.E — Create `002_products.sql` migration

Create `web-backend/src/db/migrations/002_products.sql` with this exact content:

```sql
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql
--
-- Migration 002 — product catalog schema
-- Depends on: 001_profiles_addresses.sql (reuses handle_updated_at())

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  brand text,
  retail_price_minor integer not null,
  rent_price_minor integer,
  currency text not null default 'INR',
  category text,
  collection text,
  fabric text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.product_variants (
  id uuid default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  colour text,
  quantity integer not null default 0,
  location text,
  created_at timestamp with time zone default now() not null,
  constraint product_variants_product_size_colour_location_key
    unique (product_id, size, colour, location)
);

create index if not exists product_variants_product_id_idx
  on public.product_variants (product_id);

create table if not exists public.product_images (
  id uuid default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  source_url text,
  alt text,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now() not null
);

create index if not exists product_images_product_id_sort_order_idx
  on public.product_images (product_id, sort_order);

-- ============================================================
-- Triggers
-- ============================================================

-- Reuse handle_updated_at() from migration 001.
-- Only products needs updated_at auto-maintenance; variants and images
-- are replace-wholesale, not patched.
drop trigger if exists on_product_updated on public.products;
create trigger on_product_updated
  before update on public.products
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Storage bucket
-- ============================================================

-- product-images: public-read, service-role-write, 10 MB max, images only.
-- If this insert fails in your environment (policy restrictions), run
-- scripts/create-storage-bucket.ts as a fallback.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security (DEFERRED — see spec §12)
-- ============================================================
-- RLS is intentionally OFF for v1 because there is no dashboard auth yet.
-- Turning RLS on without auth would block the service-role client for
-- no benefit and make it easy to ship subtle bugs later.
--
-- When auth lands, uncomment the block below and implement a real
-- adminMiddleware in src/middleware/admin.middleware.ts.

-- alter table public.products          enable row level security;
-- alter table public.product_variants  enable row level security;
-- alter table public.product_images    enable row level security;
--
-- create policy "Admin read products"
--   on public.products for select
--   using (exists (
--     select 1 from public.profiles p
--     where p.id = auth.uid() and p.role = 'admin'
--   ));
--
-- create policy "Admin write products"
--   on public.products for all
--   using (exists (
--     select 1 from public.profiles p
--     where p.id = auth.uid() and p.role = 'admin'
--   ))
--   with check (exists (
--     select 1 from public.profiles p
--     where p.id = auth.uid() and p.role = 'admin'
--   ));
--
-- -- Repeat mirroring policies for product_variants and product_images.
```

### 7.F — Create `002_products.md` description

Create `web-backend/src/db/migrations/002_products.md` with:

```markdown
# Migration 002 — Product catalog

**Date:** 2026-04-08
**Depends on:** `001_profiles_addresses.sql` (reuses `handle_updated_at()`)
**Spec:** `web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` §4

## What this creates

- `products` — one row per product. Prices stored as `integer` paise (e.g. ₹27,000 → 2700000) to avoid float precision bugs. `status` is `draft` or `published`. `updated_at` is auto-maintained by trigger.
- `product_variants` — one row per size × colour × location combination. `ON DELETE CASCADE` from products. Unique on `(product_id, size, colour, location)`. Indexed on `product_id`.
- `product_images` — gallery rows pointing at Supabase Storage. `source_url` is set for URL imports, `NULL` for file uploads. `ON DELETE CASCADE` from products. Indexed on `(product_id, sort_order)`.
- Storage bucket `product-images` — public read, 10 MB max, jpeg/png/webp only.

## RLS

**Intentionally disabled** for v1 — dashboard has no auth. See spec §12 for the auth rollout plan. Commented-out policy stubs at the bottom of the SQL file show exactly where admin role policies will go.

## How to run

1. Open Supabase SQL Editor at https://supabase.com/dashboard/project/_/sql
2. Paste the full contents of `002_products.sql`.
3. Run. You should see three tables under `public.` and one bucket under Storage → Buckets.
4. If the `storage.buckets` insert fails due to policy, run:
   ```bash
   cd web-backend && npx tsx scripts/create-storage-bucket.ts
   ```

## Verification

```sql
select count(*) from public.products;          -- expect 0
select count(*) from public.product_variants;  -- expect 0
select count(*) from public.product_images;    -- expect 0
select id from storage.buckets where id = 'product-images';  -- expect 1 row
```
```

### 7.G — Create `scripts/create-storage-bucket.ts`

Create `web-backend/scripts/create-storage-bucket.ts` with this exact content:

```ts
/**
 * Fallback bucket creator — run if the storage.buckets insert in
 * 002_products.sql fails due to project-level policies.
 *
 * Usage:
 *   cd web-backend && npx tsx scripts/create-storage-bucket.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main(): Promise<void> {
  const { data: existing } = await admin.storage.getBucket('product-images');
  if (existing) {
    console.log("Bucket 'product-images' already exists — no action taken.");
    return;
  }

  const { error } = await admin.storage.createBucket('product-images', {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (error) {
    console.error('Failed to create bucket:', error.message);
    process.exit(1);
  }

  console.log("Bucket 'product-images' created.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Note:** this script imports `@supabase/supabase-js` directly. That's the **one place** it is allowed — the script is a one-off utility, not a route/service. Do not add a new config wrapper for it.

## 8. Do NOT

- ❌ Do not run `git add`, `git commit`, or `git push`. The user commits manually after reviewing.
- ❌ Do not create any file under `web-backend/src/routes/` — that's task 2.
- ❌ Do not create `image-import.service.ts` — that's task 3.
- ❌ Do not add `multer` or any other dependency to `package.json` — that's task 3.
- ❌ Do not touch `web-frontend/` or `web-dashboard/src/`.
- ❌ Do not modify `src/config/supabase.ts`. It already exports `supabaseAdmin`.
- ❌ Do not enable RLS on the new tables. RLS is intentionally off for v1 — see §5.6.
- ❌ Do not define real admin auth. `admin.middleware.ts` stays a no-op.
- ❌ Do not try to run the migration against a real Supabase project. Tier-2 work is deferred; see §13.
- ❌ Do not `npm run dev`. It binds a port and blocks.
- ❌ Do not import `@supabase/supabase-js` anywhere except `scripts/create-storage-bucket.ts`.
- ❌ Do not add `any`. Use `unknown` + narrowing if you genuinely need escape-hatch typing.

## 9. Coding standards reminder

- ESM `.js` imports for local modules (`./foo.js` not `./foo`)
- Explicit return types on all exported functions (`Promise<void>`, `void`, etc.)
- Use the existing `env` import from `./config/env.js` — never read `process.env` directly in `index.ts` or middleware
- SQL file style matches `001_profiles_addresses.sql`: lowercase keywords, `if not exists` for tables, `timestamp with time zone default now()` not `timestamptz`

## 10. What tasks 2, 3, 4 will plug into

(Context only — do not write any of this.)

- Task 2 creates `web-backend/src/routes/admin-products.routes.ts` with CRUD + bulk routes, mounts it at `/api/admin/products` in `index.ts`, protected by `adminMiddleware` from this task.
- Task 3 creates `web-backend/src/services/image-import.service.ts` and appends image routes into section B of `admin-products.routes.ts`. It adds `multer` to `package.json`.
- Task 4 appends batch + suggestions routes.

Your job is to make sure `adminMiddleware` is importable (`import { adminMiddleware } from '../middleware/admin.middleware.js';`), the migration defines the tables they'll query, and CORS lets `DASHBOARD_URL` through.

## 11. Tier-1 acceptance gate (MANDATORY — you must run this)

Run these commands in order. All must succeed before you report completion.

```bash
cd /Users/harsh/Desktop/style_supply/web-backend
npm run build
```
Expected: `tsc` compiles with no errors. New files in `dist/`:
- `dist/middleware/admin.middleware.js`
- `dist/config/env.js` (rebuilt)
- `dist/index.js` (rebuilt)

```bash
cd /Users/harsh/Desktop/style_supply/web-backend
npm run lint
```
Expected: no errors. If the project has lint warnings on pre-existing files, those are not your problem — but your new files must not add any.

Then verify the files exist:

```bash
ls -la /Users/harsh/Desktop/style_supply/web-backend/src/middleware/admin.middleware.ts
ls -la /Users/harsh/Desktop/style_supply/web-backend/src/db/migrations/002_products.sql
ls -la /Users/harsh/Desktop/style_supply/web-backend/src/db/migrations/002_products.md
ls -la /Users/harsh/Desktop/style_supply/web-backend/scripts/create-storage-bucket.ts
```
Expected: four lines, no "No such file".

Then verify the inline edits landed:

```bash
grep -n 'DASHBOARD_URL' /Users/harsh/Desktop/style_supply/web-backend/.env.example
grep -n 'DASHBOARD_URL' /Users/harsh/Desktop/style_supply/web-backend/src/config/env.ts
grep -n 'DASHBOARD_URL' /Users/harsh/Desktop/style_supply/web-backend/src/index.ts
```
Expected: each command prints at least one matching line.

**If any of the above fails, do not report completion. Fix it.**

**Note on the `scripts/create-storage-bucket.ts` file:** it is NOT part of `tsc` output because the project's `tsconfig.json` excludes `scripts/**`. If `npm run build` errors because it's trying to compile the script, stop and check the tsconfig — you may need to add `"exclude": ["scripts"]`. Normally you will not need to change the tsconfig — if you do, flag it in your completion report.

## 12. Tier-2 verification (DEFERRED — do not run, but document)

The user will run these after env vars are configured. List them in your completion report so they know what to do next:

```bash
# 1. Paste 002_products.sql into Supabase SQL Editor and run.
#    Expected: three tables + one bucket created.

# 2. Run the bucket fallback in case SQL-based creation was blocked:
cd /Users/harsh/Desktop/style_supply/web-backend
npx tsx scripts/create-storage-bucket.ts
#    Expected: "Bucket 'product-images' already exists" or "Bucket 'product-images' created"

# 3. Start the dev server with DASHBOARD_URL set:
DASHBOARD_URL=http://localhost:3002 npm run dev
#    Expected: "Server running on http://localhost:3001" with no Zod parse errors.

# 4. Confirm CORS accepts the dashboard origin:
curl -i -H "Origin: http://localhost:3002" http://localhost:3001/health
#    Expected: 200, and response header includes:
#      access-control-allow-origin: http://localhost:3002
```

You are NOT expected to run any of the above — they all require a live Supabase and ports bound. Just make sure your code does not make any of them impossible.

## 13. Completion report format

When you're done, reply with **exactly** this structure. No hedging, no "I think", no preamble.

```
## Task 1 — Backend Foundation — COMPLETE

### Files created
- web-backend/src/middleware/admin.middleware.ts
- web-backend/src/db/migrations/002_products.sql
- web-backend/src/db/migrations/002_products.md
- web-backend/scripts/create-storage-bucket.ts

### Files modified
- web-backend/.env.example
- web-backend/src/config/env.ts
- web-backend/src/index.ts

### Tier-1 gate output
<paste the actual npm run build + npm run lint output>

### Tier-2 steps for the user (deferred)
<copy §12 verbatim>

### Deviations from the task file
<list anything you changed, or write "None.">

### Blockers for downstream tasks
<list anything task 2/3/4 should know, or write "None.">
```

## 14. Writing your own task file is NOT required for task 1

Tasks 2–9 each write their own `NN-*.md` task file before coding (it becomes part of the permanent record). **Task 1 is the exception** — this file IS task 1's task file, written by the main session. You don't need to generate a second one. Just execute §7 and report per §13.

---

## Appendix A — Why these files, not others

- **No `admin-products.routes.ts`** — that's 12 routes across 3 concerns (CRUD, images, batch). Splitting it across tasks 2/3/4 keeps each task's blast radius small and makes parallel dispatch viable.
- **No `image-import.service.ts`** — needs `multer` which needs a `package.json` bump; batching that with the schema migration muddies the diff.
- **Migration `.md` sibling file** — there's no existing convention for this, but future migrations benefit from a human-readable summary alongside the SQL. This starts that pattern. If the user doesn't like it in review, only one file gets deleted.
- **`scripts/create-storage-bucket.ts` is TS not JS** — the backend is a TypeScript project; using `tsx` keeps the script consistent with the rest. Adding a JS utility would be the odd one out.
