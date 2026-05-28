import type {
  Product,
  ProductPayload,
  BatchProductPayload,
  ProductListQuery,
  ProductListResponse,
  ProductImage,
  SuggestionField,
} from '@/types/product';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    throw new Error(body?.error?.message ?? res.statusText);
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

export async function importImagesFromUrls(productId: string, urls: string[]): Promise<ImageImportResult> {
  return request<ImageImportResult>(`/api/admin/products/${productId}/images/import`, {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}

export interface ScrapeFromPageResult extends ImageImportResult {
  discovered: number;
}

export async function scrapeImagesFromPage(productId: string, url: string, limit?: number): Promise<ScrapeFromPageResult> {
  return request<ScrapeFromPageResult>(`/api/admin/products/${productId}/images/scrape`, {
    method: 'POST',
    body: JSON.stringify({ url, ...(limit ? { limit } : {}) }),
  });
}

export async function uploadImages(productId: string, files: File[]): Promise<ImageImportResult> {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  const res = await fetch(`${API_BASE}/api/admin/products/${productId}/images/upload`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<ImageImportResult>;
}

export async function registerImage(
  productId: string,
  storagePath: string,
  publicUrl: string
): Promise<ProductImage> {
  return request<ProductImage>(`/api/admin/products/${productId}/images/register`, {
    method: 'POST',
    body: JSON.stringify({ storage_path: storagePath, public_url: publicUrl }),
  });
}

export async function deleteImage(imageId: string): Promise<void> {
  await request<void>(`/api/admin/products/images/${imageId}`, { method: 'DELETE' });
}

export async function reorderImages(productId: string, imageIds: string[]): Promise<void> {
  // TODO: backend has no reorder endpoint yet. No-op pending task 3/4 extension.
  void productId;
  void imageIds;
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

export async function batchImport(products: BatchProductPayload[]): Promise<BatchImportResponse> {
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
