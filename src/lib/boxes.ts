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
