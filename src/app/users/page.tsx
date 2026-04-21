'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { OnboardingSubmission } from '@/types/user';
import UserTable from '@/components/list/UserTable';
import UserDetailPanel from '@/components/list/UserDetailPanel';

const PAGE_SIZE = 50;

export default function UsersPage(): React.ReactElement {
  const [users, setUsers] = useState<OnboardingSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('onboarding_submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const trimmed = search.trim();
    if (trimmed.length > 0) {
      const pattern = `%${trimmed}%`;
      query = query.or(
        `full_name.ilike.${pattern},email.ilike.${pattern},phone_number.ilike.${pattern}`,
      );
    }

    const { data, count, error: err } = await query;
    if (err) {
      setError(err.message);
      setUsers([]);
      setTotal(0);
    } else {
      setUsers((data ?? []) as OnboardingSubmission[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [offset, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId],
  );

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">Users</h1>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-[#FDF8F4] hover:text-[#7A021D] disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setOffset(0);
            setSearch(e.target.value);
          }}
          placeholder="Search by name, email, or phone"
          className="w-full max-w-md rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-[#2C0505] placeholder:text-neutral-400 focus:border-[#7A021D] focus:outline-none focus:ring-1 focus:ring-[#7A021D]"
        />
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <UserTable
          users={users}
          loading={loading}
          onSelect={(id) => setSelectedId(id)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <div>{loading ? 'Loading…' : `${total} user${total === 1 ? '' : 's'}`}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {selected && (
        <UserDetailPanel user={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
