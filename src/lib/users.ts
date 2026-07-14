import { request } from '@/lib/api';
import type { OnboardingSubmission } from '@/types/user';

export type UserPayload = Omit<OnboardingSubmission, 'id' | 'created_at'>;

export interface ListUsersQuery {
  q?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'all';
  limit?: number;
  offset?: number;
}

export interface ListUsersResponse {
  users: OnboardingSubmission[];
  total: number;
}

/**
 * List onboarding submissions via the backend API (uses service-role key,
 * bypasses RLS — the direct Supabase anon client returns 0 rows due to RLS).
 */
export async function listUsers(query: ListUsersQuery = {}): Promise<ListUsersResponse> {
  const { q, status = 'all', limit = 50, offset = 0 } = query;

  const params = new URLSearchParams();
  if (q?.trim()) params.set('q', q.trim());
  if (status !== 'all') params.set('status', status);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const qs = params.toString();
  const data = await request<{ requests: OnboardingSubmission[]; total: number }>(
    `/api/admin/access-requests${qs ? `?${qs}` : ''}`,
  );

  // Backend returns { requests, total } — map to { users, total }
  return { users: data.requests ?? [], total: data.total ?? 0 };
}

export async function getUser(id: string): Promise<OnboardingSubmission> {
  const data = await request<{ submission: OnboardingSubmission }>(
    `/api/admin/access-requests/${id}`,
  );
  return data.submission;
}

export async function updateUser(
  id: string,
  payload: Partial<UserPayload>,
): Promise<OnboardingSubmission> {
  const data = await request<{ submission: OnboardingSubmission }>(
    `/api/admin/access-requests/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return data.submission;
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/api/admin/access-requests/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteUsers(ids: string[]): Promise<{ deleted: number }> {
  const data = await request<{ deleted: number }>('/api/admin/access-requests/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  return data;
}

export async function bulkUpdateStatus(
  ids: string[],
  status: 'pending' | 'approved' | 'rejected',
): Promise<{ updated: number }> {
  const data = await request<{ updated: number }>('/api/admin/access-requests/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  });
  return data;
}

/**
 * Approve a user — creates Supabase auth account + sends invite email.
 */
export async function approveUser(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/admin/access-requests/${id}/approve`, {
    method: 'POST',
  });
}

/**
 * Move a user to the waitlist.
 */
export async function waitlistUser(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/admin/access-requests/${id}/waitlist`, {
    method: 'POST',
  });
}

/**
 * Reject a user.
 */
export async function rejectUser(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/admin/access-requests/${id}/reject`, {
    method: 'POST',
  });
}

// Legacy alias used by some components
export const createUser = async (payload: UserPayload): Promise<OnboardingSubmission> => {
  const data = await request<{ submission: OnboardingSubmission }>(
    '/api/admin/access-requests',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.submission;
};
