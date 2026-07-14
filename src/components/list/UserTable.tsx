'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { OnboardingSubmission } from '@/types/user';

type RowAction = 'approving' | 'rejecting' | 'waitlisting' | 'deleting' | null;

interface UserTableProps {
  users: OnboardingSubmission[];
  loading: boolean;
  selection: Set<string>;
  rowBusy: string | null;
  rowAction: RowAction;
  onSelectionChange: (next: Set<string>) => void;
  onView: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onWaitlist: (id: string) => void;
  onDelete: (id: string) => void;
}

const BUSY_MESSAGES: Record<NonNullable<RowAction>, string> = {
  approving: 'Approving…',
  rejecting: 'Rejecting…',
  waitlisting: 'Waitlisting…',
  deleting: 'Deleting…',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function UserTable({
  users,
  loading,
  selection,
  rowBusy,
  rowAction,
  onSelectionChange,
  onView,
  onApprove,
  onReject,
  onWaitlist,
  onDelete,
}: UserTableProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  function toggle(id: string): void {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  function toggleAll(): void {
    if (selection.size === users.length) onSelectionChange(new Set());
    else onSelectionChange(new Set(users.map((u) => u.id)));
  }

  if (!loading && users.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-neutral-500">
        No users have signed up yet.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-[#FDF8F4] text-left text-xs font-semibold text-[#2C0505]/70">
        <tr>
          <th className="w-10 px-4 py-3">
            <input
              type="checkbox"
              checked={users.length > 0 && selection.size === users.length}
              onChange={toggleAll}
              className="rounded border-neutral-300 text-[#7A021D] focus:ring-[#7A021D]"
            />
          </th>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Email</th>
          <th className="px-4 py-3">Phone</th>
          <th className="px-4 py-3">City</th>
          <th className="px-4 py-3">PIN</th>
          <th className="px-4 py-3">Signed up</th>
          <th className="px-4 py-3">Status</th>
          <th className="w-10 px-4 py-3" />
        </tr>
      </thead>
      <tbody className="bg-white">
        {users.map((u) => (
          <tr
            key={u.id}
            className={`border-t border-neutral-100 transition-colors hover:bg-[#FDF8F4]/50 ${
              rowBusy === u.id ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selection.has(u.id)}
                onChange={() => toggle(u.id)}
                className="rounded border-neutral-300 text-[#7A021D] focus:ring-[#7A021D]"
              />
            </td>
            <td
              className="cursor-pointer px-4 py-3 font-medium text-[#2C0505] hover:text-[#7A021D]"
              onClick={() => onView(u.id)}
            >
              {u.full_name}
            </td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.email}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.phone_number || '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.city || '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.zip_code || '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{formatDate(u.created_at)}</td>
            <td className="px-4 py-3">
              {rowBusy === u.id && rowAction ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {BUSY_MESSAGES[rowAction]}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.approval_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : u.approval_status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : u.approval_status === 'waitlisted'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {u.approval_status ?? 'pending'}
                </span>
              )}
            </td>
            <td className="relative px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                className="rounded-lg p-1.5 transition-colors hover:bg-neutral-100"
                aria-label="Row actions"
              >
                <svg
                  className="h-5 w-5 text-[#2C0505]/50"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
              </button>
              {menuOpen === u.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(null)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-2 top-10 z-20 w-44 rounded-lg border border-neutral-200 bg-white py-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(null);
                        onView(u.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#FDF8F4]"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      View details
                    </button>
                    <Link
                      href={`/users/${u.id}`}
                      onClick={() => setMenuOpen(null)}
                      className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#FDF8F4]"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit
                    </Link>
                    <div className="my-1.5 border-t border-neutral-100" />
                    {u.approval_status === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(null);
                          onReject(u.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-amber-600 hover:bg-[#FDF8F4]"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Mark rejected
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(null);
                            onApprove(u.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#7A021D] hover:bg-[#FDF8F4]"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve &amp; Invite
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(null);
                            onWaitlist(u.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-yellow-700 hover:bg-yellow-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Waitlist
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(null);
                            onReject(u.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-amber-600 hover:bg-[#FDF8F4]"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </>
                    )}
                    <div className="my-1.5 border-t border-neutral-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(null);
                        onDelete(u.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
