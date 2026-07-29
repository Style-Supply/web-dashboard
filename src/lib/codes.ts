import { request } from './api';
import type { AccessCode } from '@/types/code';

export async function listCodes(): Promise<{ codes: AccessCode[] }> {
  return request<{ codes: AccessCode[] }>(`/api/admin/codes`);
}

export async function createCode(payload: Omit<AccessCode, 'id' | 'used_count' | 'created_at'>): Promise<AccessCode> {
  return request<AccessCode>(`/api/admin/codes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCode(id: string, payload: Partial<AccessCode>): Promise<AccessCode> {
  return request<AccessCode>(`/api/admin/codes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCode(id: string): Promise<void> {
  await request<void>(`/api/admin/codes/${id}`, { method: 'DELETE' });
}
