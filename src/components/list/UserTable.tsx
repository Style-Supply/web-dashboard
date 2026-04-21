'use client';

import type { OnboardingSubmission } from '@/types/user';

interface UserTableProps {
  users: OnboardingSubmission[];
  loading: boolean;
  onSelect: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function UserTable({ users, loading, onSelect }: UserTableProps): React.ReactElement {
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
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Email</th>
          <th className="px-4 py-3">Phone</th>
          <th className="px-4 py-3">City</th>
          <th className="px-4 py-3">PIN</th>
          <th className="px-4 py-3">Signed up</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {users.map((u) => (
          <tr
            key={u.id}
            onClick={() => onSelect(u.id)}
            className="cursor-pointer border-t border-neutral-100 transition-colors hover:bg-[#FDF8F4]/50"
          >
            <td className="px-4 py-3 font-medium text-[#2C0505]">{u.full_name}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.email}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.phone_number || '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.city || '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{u.zip_code || '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{formatDate(u.created_at)}</td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  u.approval_status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : u.approval_status === 'rejected'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                }`}
              >
                {u.approval_status ?? 'pending'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
