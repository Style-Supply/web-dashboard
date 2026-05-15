import { request } from './api';
import type { Membership, MembershipListResponse } from '@/types/membership';

export async function listMemberships(query: { status?: string; limit?: number; offset?: number } = {}): Promise<MembershipListResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return request<MembershipListResponse>(`/api/admin/memberships${qs ? `?${qs}` : ''}`);
}

export async function updateMembership(id: string, payload: Partial<Pick<Membership, 'status' | 'credit_balance_minor'>>): Promise<Membership> {
  return request<Membership>(`/api/admin/memberships/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
