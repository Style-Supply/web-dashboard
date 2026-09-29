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

// Admin-initiated reactivate (cancelled or paused → active).
export async function reactivateMembership(id: string): Promise<Membership> {
  return request<Membership>(`/api/admin/memberships/${id}/reactivate`, {
    method: 'POST',
  });
}

export async function createMembership(payload: {
  user_id: string;
  plan?: string;
  credit_balance_minor?: number;
  status?: string;
}): Promise<Membership> {
  return request<Membership>('/api/admin/memberships', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteMembership(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/admin/memberships/${id}`, {
    method: 'DELETE',
  });
}

export interface CreditLedgerTransaction {
  id: string;
  date: string;
  type: 'grant' | 'deduction' | 'expired';
  description: string;
  amount_minor: number;
  box_id?: string | null;
  box_number?: number | null;
  order_number?: string | null;
  box_label?: string | null;
  is_current_box?: boolean;
  box_status?: string | null;
  item_names?: string[];
  payment_type?: string | null;
  status: string;
  expires_at?: string | null;
}

export interface CreditLedgerResponse {
  membership: Membership;
  available_minor: number;
  transactions: CreditLedgerTransaction[];
  current_box?: any;
  other_boxes?: any[];
  boxes_summary?: any[];
}

export async function getMembershipCreditLedger(id: string): Promise<CreditLedgerResponse> {
  return request<CreditLedgerResponse>(`/api/admin/memberships/${id}/ledger`);
}

