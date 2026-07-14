import { request } from './api';
import type { Box, BoxListResponse } from '@/types/box';

export async function listBoxes(query: { status?: string; limit?: number; offset?: number } = {}): Promise<BoxListResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return request<BoxListResponse>(`/api/admin/boxes${qs ? `?${qs}` : ''}`);
}

export async function getBox(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}`);
}

/** T-4.7: Admin lifecycle transitions */
export async function packBox(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/pack`, { method: 'POST' });
}

export async function dispatchBox(id: string, trackingNumber?: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ tracking_number: trackingNumber }),
  });
}

export async function deliverBox(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/deliver`, { method: 'POST' });
}

/** T-5.4: QC actions */
export async function qcPassItem(boxId: string, itemId: string): Promise<{ qc_status: string }> {
  return request(`/api/admin/boxes/${boxId}/items/${itemId}/qc-pass`, { method: 'POST' });
}

export async function qcFailItem(boxId: string, itemId: string): Promise<{ qc_status: string }> {
  return request(`/api/admin/boxes/${boxId}/items/${itemId}/qc-fail`, { method: 'POST' });
}

