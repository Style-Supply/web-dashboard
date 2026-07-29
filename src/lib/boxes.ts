import { request } from './api';
import type { Box, BoxDetail, BoxListResponse } from '@/types/box';

export async function listBoxes(query: { status?: string; limit?: number; offset?: number } = {}): Promise<BoxListResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return request<BoxListResponse>(`/api/admin/boxes${qs ? `?${qs}` : ''}`);
}

export async function getBox(id: string): Promise<BoxDetail> {
  return request<BoxDetail>(`/api/admin/boxes/${id}`);
}

// confirmed → packing
export async function packBox(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/pack`, { method: 'POST' });
}

// packing → out_for_delivery (optional tracking number)
export async function dispatchBox(id: string, trackingNumber?: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(trackingNumber ? { tracking_number: trackingNumber } : {}),
  });
}

// out_for_delivery → delivered
export async function deliverBox(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/deliver`, { method: 'POST' });
}

// --- 48h boutique session control ---

// delivered → boutique_session_active (start the 48h timer for the member)
export async function startSession(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/start-session`, { method: 'POST' });
}

// extend an active session by N hours
export async function extendSession(id: string, hours = 24): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/extend-session`, {
    method: 'POST',
    body: JSON.stringify({ hours }),
  });
}

// end an active session immediately (→ decision_pending)
export async function endSession(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/end-session`, { method: 'POST' });
}

// PATCH /:id — update editable fields (tracking_number, status, notes)
export interface UpdateBoxPayload {
  tracking_number?: string | null;
  status?: string;
  notes?: string | null;
}
export async function updateBox(id: string, payload: UpdateBoxPayload): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// DELETE /:id — permanently delete box and its items
export async function deleteBox(id: string): Promise<void> {
  return request<void>(`/api/admin/boxes/${id}`, { method: 'DELETE' });
}

// --- Admin Overrides for Profile & Items ---

export async function updateBoxProfile(id: string, payload: { full_name?: string | null; phone?: string | null }): Promise<void> {
  return request<void>(`/api/admin/boxes/${id}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addBoxItem(boxId: string, productId: string, variantId: string): Promise<void> {
  return request<void>(`/api/admin/boxes/${boxId}/items`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, variant_id: variantId }),
  });
}

export async function updateBoxItem(boxId: string, itemId: string, variantId: string): Promise<void> {
  return request<void>(`/api/admin/boxes/${boxId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ variant_id: variantId }),
  });
}

export async function removeBoxItem(boxId: string, itemId: string): Promise<void> {
  return request<void>(`/api/admin/boxes/${boxId}/items/${itemId}`, { method: 'DELETE' });
}
