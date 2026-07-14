import type {
  Product,
  ProductPayload,
  BatchRowPayload,
  ProductListQuery,
  ProductListResponse,
  ProductImage,
  SuggestionField,
} from '@/types/product';
import { PRODUCT_IMAGES_BUCKET, supabase } from '@/lib/supabase';

export interface ColourTag {
  colour_id?: string | null;
  custom_colour?: string | null;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extFromMime(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  if (base === 'image/jpeg') return 'jpg';
  if (base === 'image/png') return 'png';
  if (base === 'image/webp') return 'webp';
  throw new Error(`Unsupported image type: ${mime}`);
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.stylesupply.io';

export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // Ignore errors, proceed without auth header
  }
  return {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    const message = body?.error?.message ?? res.statusText;
    const code = body?.error?.code ?? null;
    throw new ApiError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_BASE, request };

// ---------- Products ----------

export async function listProducts(query: ProductListQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return request<ProductListResponse>(`/api/admin/products${qs ? `?${qs}` : ''}`);
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/admin/products/${id}`);
}

export async function getProductWithRetry(id: string, attempts = 4): Promise<Product> {
  const delays = [300, 600, 1200, 2000];
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await getProduct(id);
    } catch (err) {
      lastErr = err;
      const is404 = err instanceof ApiError && err.status === 404;
      if (!is404 || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
    }
  }
  throw lastErr;
}

export async function saveProduct(payload: ProductPayload): Promise<Product> {
  return request<Product>(`/api/admin/products`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id: string, payload: Partial<ProductPayload>): Promise<Product> {
  return request<Product>(`/api/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await request<void>(`/api/admin/products/${id}`, { method: 'DELETE' });
}

export async function bulkDelete(ids: string[]): Promise<{ deleted: number }> {
  return request<{ deleted: number }>(`/api/admin/products/bulk-delete`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function bulkStatus(ids: string[], status: 'draft' | 'published'): Promise<{ updated: number }> {
  return request<{ updated: number }>(`/api/admin/products/bulk-status`, {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  });
}

export async function duplicateProduct(id: string, copyImages: boolean): Promise<Product> {
  return request<Product>(`/api/admin/products/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ copy_images: copyImages }),
  });
}

// ---------- Images ----------

export interface ImageImportResult {
  imported: ProductImage[];
  failed: { url: string; reason: string }[];
}

export async function importImagesFromUrls(productId: string, urls: string[], colourTag?: ColourTag): Promise<ImageImportResult> {
  return request<ImageImportResult>(`/api/admin/products/${productId}/images/import`, {
    method: 'POST',
    body: JSON.stringify({ urls, ...colourTag }),
  });
}

export interface ScrapeFromPageResult extends ImageImportResult {
  discovered: number;
}

export async function scrapeImagesFromPage(productId: string, url: string, limit?: number, colourTag?: ColourTag): Promise<ScrapeFromPageResult> {
  return request<ScrapeFromPageResult>(`/api/admin/products/${productId}/images/scrape`, {
    method: 'POST',
    body: JSON.stringify({ url, ...(limit ? { limit } : {}), ...colourTag }),
  });
}

export async function uploadImages(productId: string, files: File[], colourTag?: ColourTag): Promise<ImageImportResult> {
  const imported: ProductImage[] = [];
  const failed: { url: string; reason: string }[] = [];

  for (const file of files) {
    const label = file.name || 'file';
    try {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error(`Unsupported image type: ${file.type || 'unknown'}`);
      }
      const ext = extFromMime(file.type);
      const storagePath = `${productId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: pub } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(storagePath);

      const registered = await registerImage(productId, storagePath, pub.publicUrl, colourTag);
      imported.push(registered);
    } catch (err) {
      failed.push({ url: label, reason: err instanceof Error ? err.message : 'Upload failed' });
    }
  }

  return { imported, failed };
}

export async function registerImage(
  productId: string,
  storagePath: string,
  publicUrl: string,
  colourTag?: ColourTag,
): Promise<ProductImage> {
  return request<ProductImage>(`/api/admin/products/${productId}/images/register`, {
    method: 'POST',
    body: JSON.stringify({
      storage_path: storagePath,
      public_url: publicUrl,
      ...(colourTag?.colour_id !== undefined ? { colour_id: colourTag.colour_id } : {}),
      ...(colourTag?.custom_colour !== undefined ? { custom_colour: colourTag.custom_colour } : {}),
    }),
  });
}

export async function deleteImage(imageId: string): Promise<void> {
  await request<void>(`/api/admin/products/images/${imageId}`, { method: 'DELETE' });
}

export async function reorderImages(productId: string, imageIds: string[]): Promise<void> {
  await request<void>(`/api/admin/products/${productId}/images/reorder`, {
    method: 'POST',
    body: JSON.stringify({ image_ids: imageIds }),
  });
}

export async function retagImage(imageId: string, tag: ColourTag): Promise<ProductImage> {
  return request<ProductImage>(`/api/admin/products/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(tag),
  });
}

// ---------- Batch ----------

export interface BatchImportRow {
  index: number;
  status: 'ok' | 'error';
  product_id?: string;
  error?: string;
  image_failures?: { url: string; reason: string }[];
}

export type BatchImportResponse = BatchImportRow[];

export async function batchImport(products: BatchRowPayload[]): Promise<BatchImportResponse> {
  return request<BatchImportResponse>(`/api/admin/products/batch`, {
    method: 'POST',
    body: JSON.stringify({ products }),
  });
}

// ---------- Suggestions ----------

export async function getSuggestions(field: SuggestionField, q: string, signal?: AbortSignal): Promise<string[]> {
  const params = new URLSearchParams({ field, q });
  const res = await fetch(`${API_BASE}/api/admin/products/suggestions?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Suggestions failed: ${res.statusText}`);
  }
  const body = (await res.json()) as { values: string[] };
  return body.values;
}
