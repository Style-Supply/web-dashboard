# Task 5 of 9 — Dashboard Scaffold

You are picking up **task 5 of 9** for the StyleSupply product dashboard. No prior context. Everything you need is in this file and §2.

**Dependencies:** None. Can run fully in parallel with backend tasks 1–4.

---

## 0. What you are building

A brand-new Next.js 16 + React 19 + Tailwind v4 app at `web-dashboard/`. This task creates the full scaffold — `package.json`, config files, root layout, sidebar, TopBar, UI primitives, API client, price helpers, TypeScript product types. Pages for `/products/*` are stubs that tasks 6–9 fill in.

The dashboard talks to `http://localhost:3001` (the backend from tasks 1–4). API calls return typed stubs for routes not yet implemented — your `tsc` and `lint` must pass regardless of backend state.

## 1. Working directory

```
/Users/harsh/Desktop/style_supply/
├── web-backend/     ← do not touch
├── web-dashboard/   ← you create everything under here
└── web-frontend/    ← do not touch except reading tokens (see §6)
```

Primary working directory: `/Users/harsh/Desktop/style_supply/web-dashboard/`

The directory already contains `docs/` (spec, plan, tasks). Everything else (`src/`, `package.json`, config files) you create fresh.

## 2. Reference documents

1. **Spec:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/specs/2026-04-08-product-dashboard-design.md` — read **§4** (data shapes — mirror for TypeScript types), **§7** (app structure, routing, layout), and **§5** (API routes — write fetch wrappers for them in `api.ts`).
2. **Plan:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/superpowers/plans/2026-04-08-product-dashboard-implementation.md` — "Task 5" section and the `web-dashboard/` File Structure block.
3. **Task 1 template:** `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/01-backend-foundation.md` — §3/§9/§13 for the general conventions mindset (strict TS, explicit return types).
4. **Frontend design tokens (read-only):** `/Users/harsh/Desktop/style_supply/web-frontend/src/app/globals.css` and `/Users/harsh/Desktop/style_supply/web-frontend/tailwind.config.*` if present. Copy colour tokens `#7A021D` (primary burgundy), `#2C0505` (near-black), `#F2F2F2` (background grey), and the Manrope font stack.

## 3. Your first action: write this task file if missing

Path: `/Users/harsh/Desktop/style_supply/web-dashboard/docs/tasks/05-dashboard-scaffold.md`. If present, skip to §7.

## 4. Files you will create

All under `/Users/harsh/Desktop/style_supply/web-dashboard/`:

### Config
1. `package.json`
2. `next.config.ts`
3. `tsconfig.json`
4. `postcss.config.mjs`
5. `eslint.config.mjs`
6. `.env.local.example`
7. `.gitignore`
8. `middleware.ts` (empty auth stub)

### App
9. `src/app/layout.tsx`
10. `src/app/page.tsx` — redirects to `/products`
11. `src/app/globals.css`
12. `src/app/not-found.tsx`

### Components
13. `src/components/layout/Sidebar.tsx`
14. `src/components/layout/TopBar.tsx`
15. `src/components/ui/Button.tsx`
16. `src/components/ui/Input.tsx`
17. `src/components/ui/Textarea.tsx`
18. `src/components/ui/Dialog.tsx`

### Lib + types
19. `src/lib/api.ts`
20. `src/lib/price.ts`
21. `src/types/product.ts`

**DO NOT** create:
- Any file under `src/app/products/**` — tasks 6 (form), 9 (list/edit/preview/batch) own those routes.
- Any file under `src/components/product-form/**`, `src/components/preview/**`, `src/components/list/**`, `src/components/batch/**` — owned by tasks 6, 7, 8, 9.
- Any file under `src/hooks/**` — owned by task 6.
- `src/lib/csv-parse.ts`, `src/lib/url-check.ts` — owned by tasks 7 and 9.
- Anything under `web-backend/` or `web-frontend/`.

## 5. Tech stack / dependency pins

`package.json` `dependencies`:
```
"next": "^16.0.0",
"react": "^19.0.0",
"react-dom": "^19.0.0",
"papaparse": "^5.4.1"
```
`devDependencies`:
```
"typescript": "^5.9.0",
"@types/node": "^22.0.0",
"@types/react": "^19.0.0",
"@types/react-dom": "^19.0.0",
"@types/papaparse": "^5.3.14",
"tailwindcss": "^4.0.0",
"@tailwindcss/postcss": "^4.0.0",
"postcss": "^8.4.0",
"eslint": "^9.0.0",
"eslint-config-next": "^16.0.0"
```

If any version does not install, bump to the nearest published version — do not downgrade below the major. Report any such change in your completion report.

Scripts:
```json
"scripts": {
  "dev": "next dev -p 3002",
  "build": "next build",
  "start": "next start -p 3002",
  "lint": "next lint"
}
```

Dashboard runs on port **3002** so the backend's CORS `DASHBOARD_URL` default from task 1 works out of the box.

## 6. Conventions

- TypeScript **strict**. No `any`. Explicit return types on exported functions and React components.
- Next.js **App Router** (`src/app/`). Use RSC by default; mark client components with `'use client'`.
- Path alias `@/*` → `src/*`. Use it for all internal imports.
- Tailwind v4 via `@theme` in `globals.css` — no `tailwind.config.*` file needed.
- Colours (from frontend): `--color-primary: #7A021D; --color-ink: #2C0505; --color-bg: #F2F2F2;`
- Font: Manrope. Use `next/font/google`.
- Filenames: `kebab-case.ts` for lib/types, `PascalCase.tsx` for React components.
- No default exports for utility modules. React pages and layouts may use default exports (Next.js requires this).

## 7. Step-by-step

### 7.A — Bootstrap files

Create the 21 files in §4. Content guidelines below.

### 7.B — `tsconfig.json`

Standard Next 16 strict config:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 7.C — `globals.css`

```css
@import "tailwindcss";

@theme {
  --color-primary: #7A021D;
  --color-ink: #2C0505;
  --color-bg: #F2F2F2;
  --font-sans: "Manrope", ui-sans-serif, system-ui, sans-serif;
}

html, body { background: var(--color-bg); color: var(--color-ink); font-family: var(--font-sans); }
```

### 7.D — `layout.tsx`

Root layout with Manrope, `<Sidebar />` + `<TopBar />`, and `{children}` in a main pane. Use `next/font/google` Manrope and apply it to `<html>`.

### 7.E — `page.tsx` (root)

Use `redirect('/products')` from `next/navigation`.

### 7.F — `src/types/product.ts`

Mirror backend types from spec §4 **exactly**:
```ts
export interface ProductVariant { id?: string; product_id?: string; size: string; colour: string | null; quantity: number; location: string | null; }
export interface ProductImage { id: string; product_id: string; storage_path: string; public_url: string; source_url: string | null; alt: string | null; sort_order: number; }
export interface Product { id: string; name: string; brand: string | null; retail_price_minor: number; rent_price_minor: number | null; currency: string; category: string | null; collection: string | null; fabric: string | null; description: string | null; status: 'draft' | 'published'; created_at: string; updated_at: string; variants: ProductVariant[]; images: ProductImage[]; }
export interface ProductPayload { name: string; brand: string | null; retail_price_minor: number; rent_price_minor: number | null; currency: string; category: string | null; collection: string | null; fabric: string | null; description: string | null; status: 'draft' | 'published'; variants: ProductVariant[]; }
export interface BatchProductPayload extends ProductPayload { image_urls: string[]; }
export interface ProductListQuery { q?: string; brand?: string; category?: string; status?: 'draft'|'published'|'all'; sort?: string; limit?: number; offset?: number; }
export interface ProductListResponse { products: Product[]; total: number; }
```

### 7.G — `src/lib/price.ts`

```ts
export function toMinor(rupees: number): number { return Math.round(rupees * 100); }
export function fromMinor(minor: number): number { return minor / 100; }
export function formatINR(minor: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(fromMinor(minor));
}
```

### 7.H — `src/lib/api.ts`

Fetch wrappers with this contract (tasks 6, 7, 9 extend this file in-place):

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    throw new Error(body?.error?.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_BASE, request };
```

Also export stub-typed helpers for every route that exists by end of task 4 — `listProducts`, `getProduct`, `saveProduct`, `updateProduct`, `deleteProduct`, `bulkDelete`, `bulkStatus`, `importImagesFromUrls`, `uploadImages`, `deleteImage`, `reorderImages`, `batchImport`, `getSuggestions`, `duplicateProduct`. Some are fully implemented now, some are thin stubs that call `request` with the right signature. Downstream tasks 6/7/9 will flesh out internals; your job is that `tsc --noEmit` passes when those tasks import these names. Type everything explicitly.

### 7.I — Sidebar / TopBar / UI primitives

- **Sidebar:** fixed left column, brand wordmark at top, nav links: "Products" (`/products`), "Add Product" (`/products/new`), "Batch Upload" (`/products/batch`). Active-route highlighting via `usePathname()` — must be a client component.
- **TopBar:** top strip with page title slot + a placeholder user pill on the right. Client component.
- **Button / Input / Textarea / Dialog:** minimal Tailwind primitives. `Button` supports `variant: 'primary' | 'secondary' | 'ghost'` and `size: 'sm' | 'md'`. `Dialog` is a native `<dialog>` wrapper with open/close props.

### 7.J — `not-found.tsx`

Simple "Not found" with a link back to `/products`.

### 7.K — `middleware.ts`

Empty Next.js middleware stub that calls `NextResponse.next()` unconditionally. Leave a comment explaining task-12 auth will plug here.

### 7.L — `.env.local.example`

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### 7.M — `.gitignore`

Standard Next: `node_modules`, `.next`, `.env*.local`, `*.log`, `.DS_Store`, `next-env.d.ts`.

## 8. Do NOT

- ❌ `git commit` / `git push`.
- ❌ Create any file outside the 21 listed in §4.
- ❌ Touch `web-frontend/` or `web-backend/` source.
- ❌ Add dependencies beyond §5 (in particular: no `react-hook-form`, no `zod` on the dashboard side, no icon library, no CSS-in-JS runtime).
- ❌ Use `any`.
- ❌ Define a `tailwind.config.js/ts` — Tailwind v4 uses `@theme` in CSS.
- ❌ `npm run dev` (binds port, blocks tier-1).
- ❌ Hardcode `http://localhost:3001` anywhere except the fallback in `api.ts`.

## 9. Tier-1 gate (MANDATORY)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard
npm install
npx tsc --noEmit
npm run lint
npm run build
```
All four must pass. `npm run dev` is NOT part of the gate.

Then verify file presence:
```bash
ls /Users/harsh/Desktop/style_supply/web-dashboard/package.json
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/app/layout.tsx
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/lib/api.ts
ls /Users/harsh/Desktop/style_supply/web-dashboard/src/types/product.ts
```

## 10. Tier-2 verification (DEFERRED)

```bash
cd /Users/harsh/Desktop/style_supply/web-dashboard
npm run dev
# Visit http://localhost:3002 → redirects to /products (404 page expected until task 9 creates that route)
```

## 11. Completion report format

```
## Task 5 — Dashboard Scaffold — COMPLETE

### Files created
<list all 21>

### Tier-1 gate output
<npm install + tsc + lint + build output>

### Dependency pin changes (if any)
<list any version bumps forced by registry state, or "None.">

### Tier-2 steps (deferred)
<copy §10>

### Deviations
<list or "None.">

### Blockers for downstream tasks (6, 7, 8, 9)
<list or "None.">
```
