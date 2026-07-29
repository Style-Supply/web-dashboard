import { request } from './api';

export interface MembershipPlan {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  price_minor: number;
  default_credit_minor: number;
  is_popular: boolean;
  badge?: string;
  features: string[];
  description?: string;
  sort_order: number;
}

export interface MembershipPlanPayload {
  name: string;
  slug?: string;
  tagline?: string;
  price_minor: number;
  default_credit_minor: number;
  is_popular?: boolean;
  badge?: string;
  features?: string[];
  description?: string;
  sort_order?: number;
}

export async function listMembershipPlans(): Promise<{ plans: MembershipPlan[] }> {
  return request<{ plans: MembershipPlan[] }>('/api/admin/membership-plans');
}

export async function createMembershipPlan(payload: MembershipPlanPayload): Promise<MembershipPlan> {
  return request<MembershipPlan>('/api/admin/membership-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMembershipPlan(id: string, payload: Partial<MembershipPlanPayload>): Promise<MembershipPlan> {
  return request<MembershipPlan>(`/api/admin/membership-plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteMembershipPlan(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/admin/membership-plans/${id}`, {
    method: 'DELETE',
  });
}
