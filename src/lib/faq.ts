import { request } from './api';
import type { FaqEntry } from '@/types/faq';

export async function listFaqEntries(): Promise<{ entries: FaqEntry[] }> {
  return request<{ entries: FaqEntry[] }>(`/api/admin/faq`);
}

export async function createFaqEntry(payload: Omit<FaqEntry, 'id' | 'created_at'>): Promise<FaqEntry> {
  return request<FaqEntry>(`/api/admin/faq`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFaqEntry(id: string, payload: Partial<FaqEntry>): Promise<FaqEntry> {
  return request<FaqEntry>(`/api/admin/faq/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteFaqEntry(id: string): Promise<void> {
  await request<void>(`/api/admin/faq/${id}`, { method: 'DELETE' });
}
