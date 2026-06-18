'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  approveAccessRequest,
  bulkDeleteUsers,
  deleteUser,
  listUsers,
  rejectAccessRequest,
  waitlistAccessRequest,
} from '@/lib/users';
import type { OnboardingSubmission } from '@/types/user';
import UserTable from '@/components/list/UserTable';
import UserDetailPanel from '@/components/list/UserDetailPanel';
import UserBulkActionBar from '@/components/list/UserBulkActionBar';

const PAGE_SIZE = 50;

type BulkBusy = false | 'delete';
type RowAction = 'approving' | 'rejecting' | 'waitlisting' | 'deleting' | null;

export default function UsersPage(): React.ReactElement {
  const { showToast } = useToast();
  const [users, setUsers] = useState<OnboardingSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<BulkBusy>(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowAction, setRowAction] = useState<RowAction>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { users, total } = await listUsers({
        q: search,
        limit: PAGE_SIZE,
        offset,
      });
      setUsers(users);
      setTotal(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [offset, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId],
  );

  async function handleApprove(id: string): Promise<void> {
    setRowBusy(id);
    setRowAction('approving');
    try {
      const result = await approveAccessRequest(id);
      await load();
      const emailNote = result.email_sent
        ? 'Invite email sent.'
        : `Invite email NOT sent — share code manually: ${result.access_code}`;
      showToast(result.email_sent ? 'success' : 'error', `User approved. ${emailNote}`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setRowBusy(null);
      setRowAction(null);
    }
  }

  async function handleReject(id: string): Promise<void> {
    setRowBusy(id);
    setRowAction('rejecting');
    try {
      await rejectAccessRequest(id);
      await load();
      showToast('success', 'User rejected');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setRowBusy(null);
      setRowAction(null);
    }
  }

  async function handleWaitlist(id: string): Promise<void> {
    setRowBusy(id);
    setRowAction('waitlisting');
    try {
      await waitlistAccessRequest(id);
      await load();
      showToast('success', 'User waitlisted');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Waitlist failed');
    } finally {
      setRowBusy(null);
      setRowAction(null);
    }
  }

  async function handleRowDelete(id: string): Promise<void> {
    if (!confirm('Delete this user?')) return;
    setRowBusy(id);
    setRowAction('deleting');
    try {
      await deleteUser(id);
      setSelection((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
      showToast('success', 'User deleted');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setRowBusy(null);
      setRowAction(null);
    }
  }

  async function handleBulkDelete(): Promise<void> {
    if (!confirm(`Delete ${selection.size} user${selection.size === 1 ? '' : 's'}?`)) return;
    setBulkBusy('delete');
    try {
      const count = selection.size;
      await bulkDeleteUsers(Array.from(selection));
      setSelection(new Set());
      await load();
      showToast('success', `${count} user${count === 1 ? '' : 's'} deleted`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Bulk delete failed');
    } finally {
      setBulkBusy(false);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">Users</h1>
        <div className="flex items-center gap-2">
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
          <Link
            href="/users/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A021D] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6B0019]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add User
          </Link>
        </div>
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

      <div className="mb-3">
        <UserBulkActionBar
          selectedIds={Array.from(selection)}
          busy={bulkBusy}
          onDelete={() => void handleBulkDelete()}
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
          selection={selection}
          rowBusy={rowBusy}
          rowAction={rowAction}
          onSelectionChange={setSelection}
          onView={(id) => setSelectedId(id)}
          onApprove={(id) => void handleApprove(id)}
          onReject={(id) => void handleReject(id)}
          onWaitlist={(id) => void handleWaitlist(id)}
          onDelete={(id) => void handleRowDelete(id)}
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
