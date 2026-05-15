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

export async function shipBox(id: string, trackingNumber: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/ship`, {
    method: 'POST',
    body: JSON.stringify({ tracking_number: trackingNumber }),
  });
}

export async function deliverBox(id: string): Promise<Box> {
  return request<Box>(`/api/admin/boxes/${id}/deliver`, { method: 'POST' });
}
