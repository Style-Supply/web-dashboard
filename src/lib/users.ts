import { supabase } from '@/lib/supabase';
import type { OnboardingSubmission } from '@/types/user';

export type UserPayload = Omit<OnboardingSubmission, 'id' | 'created_at'>;

export interface ListUsersQuery {
  q?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  limit?: number;
  offset?: number;
}

export interface ListUsersResponse {
  users: OnboardingSubmission[];
  total: number;
}

export async function listUsers(query: ListUsersQuery = {}): Promise<ListUsersResponse> {
  const { q, status = 'all', limit = 50, offset = 0 } = query;

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

  const { data, count, error } = await builder;
  if (error) throw new Error(error.message);

  return { users: (data ?? []) as OnboardingSubmission[], total: count ?? 0 };
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
  const { data, error } = await supabase
    .from('onboarding_submissions')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OnboardingSubmission;
}

export async function updateUser(
  id: string,
  payload: Partial<UserPayload>,
): Promise<OnboardingSubmission> {
  const { data, error } = await supabase
    .from('onboarding_submissions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OnboardingSubmission;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('onboarding_submissions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function bulkDeleteUsers(ids: string[]): Promise<{ deleted: number }> {
  const { error, count } = await supabase
    .from('onboarding_submissions')
    .delete({ count: 'exact' })
    .in('id', ids);
  if (error) throw new Error(error.message);
  return { deleted: count ?? 0 };
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
