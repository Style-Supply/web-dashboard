import { supabase } from '@/lib/supabase';
import { request } from '@/lib/api';
import type { OnboardingSubmission } from '@/types/user';

export type UserPayload = Omit<OnboardingSubmission, 'id' | 'created_at'>;

export interface ApproveResult {
  success: boolean;
  submission: OnboardingSubmission;
  access_code: string;
  user_id: string;
  email_sent: boolean;
}

/**
 * Approve an access request via the backend. This creates a Supabase auth
 * user, generates the access-code password, and sends the invite email.
 */
export async function approveAccessRequest(id: string): Promise<ApproveResult> {
  return request<ApproveResult>(`/api/admin/access-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function rejectAccessRequest(
  id: string,
  adminNotes?: string,
): Promise<{ success: boolean; submission: OnboardingSubmission }> {
  return request(`/api/admin/access-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ admin_notes: adminNotes }),
  });
}

export async function waitlistAccessRequest(
  id: string,
  adminNotes?: string,
): Promise<{ success: boolean; submission: OnboardingSubmission }> {
  return request(`/api/admin/access-requests/${id}/waitlist`, {
    method: 'POST',
    body: JSON.stringify({ admin_notes: adminNotes }),
  });
}

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

export async function listUsers(query: ListUsersQuery = {}): Promise<ListUsersResponse> {
  const { q, status = 'all', limit = 50, offset = 0 } = query;

  let rawSubmissions: OnboardingSubmission[] = [];
  let count: number | null = 0;

  try {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const res = await request<ListUsersResponse>(`/api/admin/access-requests?${params.toString()}`);
    rawSubmissions = res.users;
    count = res.total;
  } catch (_err) {
    let builder = supabase
      .from('onboarding_submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const trimmed = q?.trim();
    if (trimmed) {
      const pattern = `%${trimmed}%`;
      builder = builder.or(
        `full_name.ilike.${pattern},email.ilike.${pattern},phone_number.ilike.${pattern}`,
      );
    }

    if (status !== 'all') {
      builder = builder.eq('approval_status', status);
    }

    const { data, count: c, error } = await builder;
    if (error) throw new Error(error.message);
    rawSubmissions = (data ?? []) as OnboardingSubmission[];
    count = c;
  }

  const submissions = rawSubmissions;

  // Query profiles to find all users marked role = 'admin' in profiles table
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role')
    .eq('role', 'admin');

  const adminProfileMap = new Map<string, { id: string; full_name: string | null; phone: string | null }>();
  if (adminProfiles) {
    for (const p of adminProfiles) {
      adminProfileMap.set(p.id, p);
    }
  }

  // Tag submissions that match admin linked_user_ids or emails
  const submissionsWithRoles = submissions.map((sub) => {
    const isAdmin =
      (sub.linked_user_id && adminProfileMap.has(sub.linked_user_id)) ||
      sub.email.toLowerCase().includes('admin') ||
      sub.email.toLowerCase() === 'tech@stylesupply.io' ||
      (sub.admin_notes && sub.admin_notes.toLowerCase().includes('admin'));

    return {
      ...sub,
      role: (isAdmin ? 'admin' : 'user') as 'admin' | 'user',
    };
  });

  // Synthesize admin entries for admins in profiles who might not be in onboarding_submissions (e.g. tech@stylesupply.io)
  const existingEmails = new Set(submissionsWithRoles.map((s) => s.email.toLowerCase()));

  // Fallback default admin accounts if not already present
  const DEFAULT_ADMINS: Partial<OnboardingSubmission>[] = [
    {
      id: 'admin-tech-01',
      full_name: 'StyleSupply Tech Admin',
      email: 'tech@stylesupply.io',
      phone_number: '+91 98765 43210',
      city: 'Mumbai',
      approval_status: 'approved',
      created_at: new Date().toISOString(),
      admin_notes: 'System Super Administrator Account',
      role: 'admin',
    },
    {
      id: 'admin-main-02',
      full_name: 'StyleSupply Lead Admin',
      email: 'admin@stylesupply.io',
      phone_number: '+91 99887 76655',
      city: 'Mumbai',
      approval_status: 'approved',
      created_at: new Date().toISOString(),
      admin_notes: 'Lead Operations Administrator',
      role: 'admin',
    },
  ];

  for (const defAdmin of DEFAULT_ADMINS) {
    if (defAdmin.email && !existingEmails.has(defAdmin.email.toLowerCase())) {
      submissionsWithRoles.unshift(defAdmin as unknown as typeof submissionsWithRoles[0]);
    }
  }

  return {
    users: submissionsWithRoles,
    total: (count ?? 0) + (submissionsWithRoles.length - submissions.length),
  };
}

export async function getUser(id: string): Promise<OnboardingSubmission> {
  const { data, error } = await supabase
    .from('onboarding_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as OnboardingSubmission;
}

export async function createUser(payload: UserPayload): Promise<OnboardingSubmission> {
  const { role, ...insertFields } = payload as any;
  const { data, error } = await supabase
    .from('onboarding_submissions')
    .insert(insertFields)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OnboardingSubmission;
}

export async function updateUser(
  id: string,
  payload: Partial<UserPayload>,
): Promise<OnboardingSubmission> {
  const { role, ...updateFields } = payload as any;
  const { data, error } = await supabase
    .from('onboarding_submissions')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (role && data?.linked_user_id) {
    await supabase.from('profiles').update({ role }).eq('id', data.linked_user_id);
  }

  return data as OnboardingSubmission;
}

export async function deleteUser(id: string): Promise<void> {
  try {
    await request<void>(`/api/admin/access-requests/${id}`, { method: 'DELETE' });
  } catch (_err) {
    const { error } = await supabase.from('onboarding_submissions').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

export async function bulkDeleteUsers(ids: string[]): Promise<{ deleted: number }> {
  try {
    return await request<{ deleted: number }>(`/api/admin/access-requests/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  } catch (_err) {
    const { error, count } = await supabase
      .from('onboarding_submissions')
      .delete({ count: 'exact' })
      .in('id', ids);
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  }
}

export async function bulkUpdateStatus(
  ids: string[],
  status: 'pending' | 'approved' | 'rejected',
): Promise<{ updated: number }> {
  const { error, count } = await supabase
    .from('onboarding_submissions')
    .update({ approval_status: status }, { count: 'exact' })
    .in('id', ids);
  if (error) throw new Error(error.message);
  return { updated: count ?? 0 };
}
