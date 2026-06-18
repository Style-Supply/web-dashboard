import { request } from './api';

export type PaymentStatus =
  | 'pending_user_confirmation'
  | 'pending_admin_verification'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export interface Payment {
  id: string;
  user_id: string;
  box_id: string | null;
  membership_id: string | null;
  payment_type: 'membership' | 'purchase';
  amount_minor: number;
  gst_minor: number;
  credit_applied_minor: number;
  payable_minor: number;
  status: PaymentStatus;
  user_confirmed_at: string | null;
  admin_confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  user?: { id: string; full_name: string | null };
  box?: { id: string; status: string };
  membership?: { id: string; plan: string; status: string };
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
}

export async function listPayments(query: {
  status?: PaymentStatus;
  payment_type?: 'membership' | 'purchase';
  limit?: number;
  offset?: number;
} = {}): Promise<PaymentListResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return request<PaymentListResponse>(`/api/admin/payments${qs ? `?${qs}` : ''}`);
}

export async function listPendingPayments(): Promise<PaymentListResponse> {
  return request<PaymentListResponse>(`/api/admin/payments/pending`);
}

export async function confirmPayment(id: string, notes?: string): Promise<{ payment: Payment }> {
  return request<{ payment: Payment }>(`/api/admin/payments/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function failPayment(id: string, notes?: string): Promise<{ payment: Payment }> {
  return request<{ payment: Payment }>(`/api/admin/payments/${id}/fail`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}
