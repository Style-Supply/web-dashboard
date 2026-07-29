'use client';

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
import { listManagers, type StaffMember } from '@/lib/staff';
import type { OnboardingSubmission } from '@/types/user';
import { useAuth } from '@/context/AuthContext';
import UserTable from '@/components/list/UserTable';
import UserDetailPanel from '@/components/list/UserDetailPanel';
import UserBulkActionBar from '@/components/list/UserBulkActionBar';
import UserForm from '@/components/user-form/UserForm';
import ManagerDrawer from '@/components/staff/ManagerDrawer';

const PAGE_SIZE = 50;

type MainRoleTab = 'users' | 'admin' | 'managers';
type BulkBusy = false | 'delete';
type RowAction = 'approving' | 'rejecting' | 'waitlisting' | 'deleting' | null;
type StatusFilter = 'all' | 'pending' | 'approved' | 'waitlisted' | 'rejected';

function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

function IconGrid({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-[#7A021D]' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
    </svg>
  );
}

function IconList({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-[#7A021D]' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function UsersPage(): React.ReactElement {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const isAdminUser = useMemo(() => {
    if (!currentUser?.email) return true; // Default fallback for dev/demo dashboard session
    const email = currentUser.email.toLowerCase();
    return email.endsWith('@stylesupply.io') || email.includes('admin');
  }, [currentUser]);

  // Top Level Main Role Tab: 'users' or 'admin'
  const [roleTab, setRoleTab] = useState<MainRoleTab>('users');

  const [users, setUsers] = useState<OnboardingSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<BulkBusy>(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowAction, setRowAction] = useState<RowAction>(null);

  // Popup Drawer State
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<OnboardingSubmission | null>(null);

  // Manager Staff state
  const [managers, setManagers] = useState<StaffMember[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managerDrawerMode, setManagerDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [editingManager, setEditingManager] = useState<StaffMember | null>(null);

  const loadManagers = useCallback(async () => {
    if (!isAdminUser) return;
    setManagersLoading(true);
    try {
      const { managers } = await listManagers();
      setManagers(managers);
    } catch {
      // non-fatal
    } finally {
      setManagersLoading(false);
    }
  }, [isAdminUser]);

  // Load managers when tab is active
  useEffect(() => {
    if (roleTab === 'managers') void loadManagers();
  }, [roleTab, loadManagers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { users, total } = await listUsers({
        q: search,
        status: statusFilter,
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
  }, [offset, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Separate Users into Admin Accounts vs Member Users
  const { adminList, memberList } = useMemo(() => {
    const admin: OnboardingSubmission[] = [];
    const member: OnboardingSubmission[] = [];

    for (const u of users) {
      const isAdminRole =
        u.role === 'admin' ||
        (u.admin_notes && u.admin_notes.toLowerCase().includes('admin')) ||
        (u.email && u.email.toLowerCase().includes('admin'));

      if (isAdminRole) admin.push(u);
      else member.push(u);
    }
    return { adminList: admin, memberList: member };
  }, [users]);

  const activeDisplayList = roleTab === 'admin' ? adminList : memberList;

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId],
  );

  function openAddUser() {
    if (roleTab === 'admin') {
      setEditingUser({
        id: '',
        created_at: '',
        full_name: '',
        email: '',
        phone_number: null,
        floor_apartment: null,
        city: 'Mumbai',
        zip_code: null,
        instagram_handle: null,
        height_value: null,
        height_unit: null,
        shoulder_width_value: null,
        shoulder_width_unit: null,
        bust_size_value: null,
        bust_size_unit: null,
        waist_size_value: null,
        waist_size_unit: null,
        hips_size_value: null,
        hips_size_unit: null,
        age_value: null,
        age_unit: null,
        morning_routine_selections: null,
        approval_status: 'approved',
        admin_notes: 'Administrator Account',
        role: 'admin',
      });
    } else {
      setEditingUser(null);
    }
    setDrawerMode('create');
  }

  function openEditUser(user: OnboardingSubmission) {
    setEditingUser(user);
    setDrawerMode('edit');
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditingUser(null);
  }

  function handleFormSuccess() {
    closeDrawer();
    void load();
  }

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

  const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All Statuses' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'waitlisted', label: 'Waitlisted' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">
        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2C0505]">Users &amp; Accounts</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {loading ? 'Loading directory…' : `Managing ${total} accounts across Admin & User roles`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 shadow-xs"
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
            <button
              onClick={openAddUser}
              className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {roleTab === 'admin' ? 'Add Admin' : 'Add User'}
            </button>
          </div>
        </div>

        {/* ── Main Role Tabs: Admin vs Users ── */}
        <div className="mb-6 border-b border-neutral-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setRoleTab('users')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                roleTab === 'users'
                  ? 'border-[#7A021D] text-[#7A021D]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <span>👤 Member Users</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleTab === 'users' ? 'bg-[#7A021D] text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                {memberList.length}
              </span>
            </button>

            {isAdminUser && (
              <button
                onClick={() => setRoleTab('admin')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                  roleTab === 'admin'
                    ? 'border-[#7A021D] text-[#7A021D]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <span>👑 Admin Accounts</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleTab === 'admin' ? 'bg-[#7A021D] text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  {adminList.length}
                </span>
              </button>
            )}

            {isAdminUser && (
              <button
                onClick={() => setRoleTab('managers')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                  roleTab === 'managers'
                    ? 'border-[#7A021D] text-[#7A021D]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <span>🛠️ Manager Staff</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleTab === 'managers' ? 'bg-[#7A021D] text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  {managers.length}
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* ── Sub Toolbar: Status Tabs & Search ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs (for Users tab) */}
          <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setOffset(0);
                  setStatusFilter(tab.id);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[#7A021D] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & View Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setOffset(0);
                  setSearch(e.target.value);
                }}
                placeholder="Search name, email, phone…"
                className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D]"
              />
            </div>

            <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
              <button
                onClick={() => setView('grid')}
                title="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  view === 'grid' ? 'bg-[#FDF8F4] shadow-xs' : 'hover:bg-neutral-50'
                }`}
              >
                <IconGrid active={view === 'grid'} />
              </button>
              <button
                onClick={() => setView('list')}
                title="List view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  view === 'list' ? 'bg-[#FDF8F4] shadow-xs' : 'hover:bg-neutral-50'
                }`}
              >
                <IconList active={view === 'list'} />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <UserBulkActionBar
            selectedIds={Array.from(selection)}
            busy={bulkBusy}
            onDelete={() => void handleBulkDelete()}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Skeleton Loading ── */}
        {loading && view === 'grid' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════
            GRID VIEW
        ══════════════════════════════════════ */}
        {!loading && activeDisplayList.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeDisplayList.map((u) => (
              <div
                key={u.id}
                className={`group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:shadow-md transition-all ${
                  rowBusy === u.id ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] font-bold text-sm border border-[#7A021D]/20 shadow-xs">
                        {userInitials(u.full_name)}
                      </div>
                      <div>
                        <h3
                          onClick={() => setSelectedId(u.id)}
                          className="text-base font-bold text-[#2C0505] hover:text-[#7A021D] cursor-pointer transition-colors"
                        >
                          {u.full_name}
                        </h3>
                        <p className="text-xs text-neutral-400">{u.city || 'Location unspecified'}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        roleTab === 'admin'
                          ? 'bg-[#7A021D] text-white'
                          : u.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : u.approval_status === 'rejected'
                              ? 'bg-red-50 text-red-700'
                              : u.approval_status === 'waitlisted'
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {roleTab === 'admin' ? '👑 Admin' : u.approval_status ?? 'pending'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-neutral-500">
                    <p className="truncate">📧 {u.email}</p>
                    <p>📞 {u.phone_number || '—'}</p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedId(u.id)}
                    className="font-semibold text-[#7A021D] hover:underline"
                  >
                    View Details
                  </button>

                  <div className="flex items-center gap-1.5">
                    {u.approval_status !== 'approved' && (
                      <button
                        onClick={() => void handleApprove(u.id)}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => openEditUser(u)}
                      className="rounded-lg bg-neutral-100 px-2.5 py-1 font-medium text-neutral-600 hover:bg-neutral-200 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════
            LIST VIEW
        ══════════════════════════════════════ */}
        {view === 'list' && roleTab !== 'managers' && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
            {activeDisplayList.length === 0 && !loading ? (
              <div className="py-16 text-center text-neutral-400 text-sm">
                No {roleTab === 'admin' ? 'admin accounts' : 'member users'} found.
              </div>
            ) : (
              <UserTable
                users={activeDisplayList}
                loading={loading}
                selection={selection}
                rowBusy={rowBusy}
                rowAction={rowAction}
                onSelectionChange={setSelection}
                onView={(id) => setSelectedId(id)}
                onEdit={(id) => {
                  const target = users.find((u) => u.id === id);
                  if (target) openEditUser(target);
                }}
                onApprove={(id) => void handleApprove(id)}
                onReject={(id) => void handleReject(id)}
                onWaitlist={(id) => void handleWaitlist(id)}
                onDelete={(id) => void handleRowDelete(id)}
              />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            MANAGER STAFF TAB CONTENT
        ══════════════════════════════════════ */}
        {roleTab === 'managers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                {managersLoading ? 'Loading managers…' : `${managers.length} manager${managers.length === 1 ? '' : 's'} with controlled dashboard access`}
              </p>
              <button
                onClick={() => { setEditingManager(null); setManagerDrawerMode('create'); }}
                className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Manager
              </button>
            </div>

            {managersLoading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl bg-neutral-100 animate-pulse" />)}
              </div>
            ) : managers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 py-16 text-center">
                <div className="text-4xl mb-3">🛠️</div>
                <p className="font-semibold text-neutral-600">No managers yet</p>
                <p className="text-sm text-neutral-400 mt-1">Create a manager to give staff limited dashboard access.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      {['Manager', 'Department', 'Status', 'Permissions', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {managers.map((m) => {
                      const initials = m.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'M';
                      const activePerms = m.permissions?.filter((p) => p.can_view || p.can_create || p.can_edit || p.can_delete) ?? [];
                      return (
                        <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-800">{m.full_name}</p>
                                <p className="text-xs text-neutral-400">{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-neutral-600">{m.department || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {m.is_active ? '● Active' : '○ Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-neutral-500">
                              {activePerms.length > 0 ? `${activePerms.length} resource${activePerms.length === 1 ? '' : 's'}` : 'No access'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setEditingManager(m); setManagerDrawerMode('edit'); }}
                              className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
                            >
                              Edit & Permissions
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Pagination (hidden on managers tab) ── */}
        {roleTab !== 'managers' && (
          <div className="mt-5 flex items-center justify-between text-sm text-neutral-600">
            <div>{loading ? 'Loading…' : `${activeDisplayList.length} ${roleTab === 'admin' ? 'admin' : 'member'} account${activeDisplayList.length === 1 ? '' : 's'}`}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                className="rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-[#FDF8F4] disabled:opacity-40 shadow-xs"
              >
                Prev
              </button>
              <span className="text-xs font-medium">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-[#FDF8F4] disabled:opacity-40 shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {selected && (
          <UserDetailPanel user={selected} onClose={() => setSelectedId(null)} />
        )}
      </div>

      {/* ── Slide-Over Add / Edit User Drawer ── */}
      {drawerMode && (
        <UserForm
          mode={drawerMode}
          initial={editingUser ?? undefined}
          onClose={closeDrawer}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* ── Slide-Over Manager Drawer ── */}
      {managerDrawerMode && (
        <ManagerDrawer
          mode={managerDrawerMode}
          initial={editingManager ?? undefined}
          onClose={() => { setManagerDrawerMode(null); setEditingManager(null); }}
          onSuccess={(manager) => {
            setManagerDrawerMode(null);
            setEditingManager(null);
            void loadManagers();
          }}
        />
      )}
    </>
  );
}
