'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listMemberships, updateMembership } from '@/lib/memberships';
import { listMembershipPlans, type MembershipPlan } from '@/lib/membership-plans';
import type { Membership, MembershipStatus } from '@/types/membership';
import ActivateMembershipDrawer from '@/components/membership-form/ActivateMembershipDrawer';
import MembershipPlanDrawer from '@/components/membership-form/MembershipPlanDrawer';

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_COLORS: Record<MembershipStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
};

function formatRupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function userInitials(name?: string | null): string {
  if (!name) return 'M';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'M';
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

export default function MembershipsPage(): React.ReactElement {
  const { showToast } = useToast();

  // Active Main Tab: 'members' or 'tiers'
  const [mainTab, setMainTab] = useState<'members' | 'tiers'>('members');

  // Memberships State
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [offset, setOffset] = useState(0);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  // Tiers (Plans) State
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<MembershipPlan | null>(null);
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);

  // Activate Drawer State
  const [isActivateDrawerOpen, setIsActivateDrawerOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMemberships({ status: statusFilter || undefined, limit: PAGE_SIZE, offset });
      setMemberships(result.memberships);
      setTotal(result.total);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, showToast]);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await listMembershipPlans();
      setPlans(res.plans);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load membership tiers');
    } finally {
      setLoadingPlans(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (mainTab === 'members') void loadMemberships();
    else void loadPlans();
  }, [mainTab, loadMemberships, loadPlans]);

  const filteredMemberships = useMemo(() => {
    if (!search.trim()) return memberships;
    const query = search.toLowerCase();
    return memberships.filter(
      (m) =>
        m.profiles?.full_name?.toLowerCase().includes(query) ||
        m.profiles?.phone?.includes(query) ||
        m.plan.toLowerCase().includes(query),
    );
  }, [memberships, search]);

  const activeCount = useMemo(() => memberships.filter((m) => m.status === 'active').length, [memberships]);
  const pausedCount = useMemo(() => memberships.filter((m) => m.status === 'paused').length, [memberships]);
  const totalCreditMinor = useMemo(
    () => memberships.reduce((acc, m) => acc + (m.credit_balance_minor || 0), 0),
    [memberships],
  );

  async function handleStatusChange(id: string, status: MembershipStatus): Promise<void> {
    setRowBusy(id);
    try {
      await updateMembership(id, { status });
      showToast('success', `Membership set to ${STATUS_LABELS[status]}`);
      void loadMemberships();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setRowBusy(null);
    }
  }

  async function handleAdjustCredit(m: Membership): Promise<void> {
    const current = (m.credit_balance_minor / 100).toString();
    const input = prompt(`Adjust credit balance (₹) for ${m.profiles?.full_name ?? 'user'}:`, current);
    if (input === null) return;
    const rupees = Number(input);
    if (!Number.isFinite(rupees) || rupees < 0) {
      showToast('error', 'Enter a valid non-negative number');
      return;
    }
    setRowBusy(m.id);
    try {
      await updateMembership(m.id, { credit_balance_minor: Math.round(rupees * 100) });
      showToast('success', 'Credit balance updated');
      void loadMemberships();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setRowBusy(null);
    }
  }

  function openAddPlan() {
    setSelectedPlanForEdit(null);
    setIsPlanDrawerOpen(true);
  }

  function openEditPlan(plan: MembershipPlan) {
    setSelectedPlanForEdit(plan);
    setIsPlanDrawerOpen(true);
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const STATUS_TABS = [
    { id: '', label: 'All Memberships' },
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'expired', label: 'Expired' },
  ];

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">
        {/* ── Top Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#2C0505]">Memberships & Tiers</h1>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#7A021D] hover:bg-[#FDF8F4] transition-colors shadow-xs"
              >
                <span>❓</span> {showHelp ? 'Hide Guide' : 'Help & Guide'}
              </button>
            </div>
            <p className="mt-0.5 text-sm text-neutral-500">
              Manage member accounts, credit balances, and subscription tiers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (mainTab === 'members' ? void loadMemberships() : void loadPlans())}
              disabled={loading || loadingPlans}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 shadow-xs"
            >
              <svg
                className={`h-4 w-4 ${loading || loadingPlans ? 'animate-spin' : ''}`}
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
              {loading || loadingPlans ? 'Loading…' : 'Refresh'}
            </button>

            {mainTab === 'tiers' ? (
              <button
                onClick={openAddPlan}
                className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Membership Tier
              </button>
            ) : (
              <button
                onClick={() => setIsActivateDrawerOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Activate New Membership
              </button>
            )}
          </div>
        </div>

        {/* ── Main Tab Navigation: Member Subscriptions vs Tier Plans ── */}
        <div className="mb-6 border-b border-neutral-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setMainTab('members')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                mainTab === 'members'
                  ? 'border-[#7A021D] text-[#7A021D]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              💳 Active Subscriptions ({total})
            </button>
            <button
              onClick={() => setMainTab('tiers')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                mainTab === 'tiers'
                  ? 'border-[#7A021D] text-[#7A021D]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              👑 Membership Tiers ({plans.length})
            </button>
          </nav>
        </div>

        {/* ── Help Guide Banner ── */}
        {showHelp && (
          <div className="mb-6 rounded-2xl border border-[#7A021D]/20 bg-[#FDF8F4] p-5 shadow-xs transition-all">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-bold text-[#7A021D]">💡 Memberships Management & Rules</h3>
              <button onClick={() => setShowHelp(false)} className="text-xs font-bold text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs text-[#2C0505]/80">
              <div className="rounded-xl border border-[#7A021D]/10 bg-white p-3.5 shadow-xs">
                <p className="font-semibold text-[#7A021D] mb-1">🎁 The Invitation & Atelier</p>
                <p>
                  Members can apply for Free Access or subscribe to The Atelier (₹5,000/mo) where 100% of the fee returns as rental credit.
                </p>
              </div>
              <div className="rounded-xl border border-[#7A021D]/10 bg-white p-3.5 shadow-xs">
                <p className="font-semibold text-[#7A021D] mb-1">🔒 In-Flight Box Protection</p>
                <p>
                  Memberships with an active box order in transit or in session cannot be paused or cancelled until items are returned.
                </p>
              </div>
              <div className="rounded-xl border border-[#7A021D]/10 bg-white p-3.5 shadow-xs">
                <p className="font-semibold text-[#7A021D] mb-1">👑 Tier Customization</p>
                <p>
                  Switch to the &quot;Membership Tiers&quot; tab above to view, create, edit, or remove tier plans shown to customers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 1: MEMBERS LIST
        ══════════════════════════════════════ */}
        {mainTab === 'members' && (
          <>
            {/* KPI Metrics */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Memberships</p>
                <p className="mt-2 text-2xl font-extrabold text-[#2C0505]">{total}</p>
                <p className="mt-1 text-xs text-neutral-500">Registered member profiles</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Active Members</p>
                <p className="mt-2 text-2xl font-extrabold text-emerald-900">{activeCount}</p>
                <p className="mt-1 text-xs text-emerald-600">Currently active subscribers</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Paused / Holding</p>
                <p className="mt-2 text-2xl font-extrabold text-amber-900">{pausedCount}</p>
                <p className="mt-1 text-xs text-amber-600">On temporary membership hold</p>
              </div>
              <div className="rounded-2xl border border-[#7A021D]/20 bg-[#FDF8F4] p-5 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7A021D]">Total Active Credit</p>
                <p className="mt-2 text-2xl font-extrabold text-[#7A021D]">
                  {formatRupees(totalCreditMinor)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">Available credit across members</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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

              <div className="flex items-center gap-3">
                <div className="relative max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search member or phone…"
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

            {loading && view === 'grid' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl bg-neutral-200 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && filteredMemberships.length > 0 && view === 'grid' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMemberships.map((m) => (
                  <div
                    key={m.id}
                    className={`group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:shadow-md transition-all ${
                      rowBusy === m.id ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] font-bold text-sm border border-[#7A021D]/20 shadow-xs">
                            {userInitials(m.profiles?.full_name)}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-[#2C0505]">
                              {m.profiles?.full_name ?? 'Anonymous Member'}
                            </h3>
                            <p className="text-xs text-neutral-400 capitalize">{m.plan.replace(/_/g, ' ')}</p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            STATUS_COLORS[m.status] ?? 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {STATUS_LABELS[m.status] ?? m.status}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Credit Balance</p>
                          <p className="text-lg font-bold text-[#7A021D]">
                            {formatRupees(m.credit_balance_minor)}
                          </p>
                        </div>
                        <button
                          onClick={() => void handleAdjustCredit(m)}
                          disabled={rowBusy === m.id}
                          className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#7A021D] border border-neutral-200 hover:bg-[#FDF8F4] transition-colors shadow-2xs"
                        >
                          Edit Credit
                        </button>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-neutral-500">
                        <p>📅 Activated: {new Date(m.activated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p>⏳ Expires: {m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-IN') : 'Never (Lifetime)'}</p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2 text-xs">
                      {m.status === 'active' && (
                        <button
                          onClick={() => void handleStatusChange(m.id, 'paused')}
                          disabled={rowBusy === m.id}
                          className="rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          Pause
                        </button>
                      )}
                      {m.status === 'paused' && (
                        <button
                          onClick={() => void handleStatusChange(m.id, 'active')}
                          disabled={rowBusy === m.id}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      {(m.status === 'active' || m.status === 'paused') && (
                        <button
                          onClick={() => void handleStatusChange(m.id, 'cancelled')}
                          disabled={rowBusy === m.id}
                          className="rounded-lg bg-neutral-100 px-3 py-1.5 font-medium text-neutral-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'list' && (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
                <table className="w-full text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Credit Balance</th>
                      <th className="px-5 py-3.5">Activated</th>
                      <th className="px-5 py-3.5">Expires</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">Loading memberships…</td>
                      </tr>
                    ) : filteredMemberships.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">No memberships found</td>
                      </tr>
                    ) : (
                      filteredMemberships.map((m) => (
                        <tr key={m.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] font-bold text-xs border border-[#7A021D]/20">
                                {userInitials(m.profiles?.full_name)}
                              </div>
                              <div>
                                <p className="font-bold text-[#2C0505]">{m.profiles?.full_name ?? 'Unknown'}</p>
                                <p className="text-xs text-neutral-400">{m.profiles?.phone || 'No phone'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-medium capitalize text-neutral-700">
                            {m.plan.replace(/_/g, ' ')}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[m.status]}`}>
                              {STATUS_LABELS[m.status]}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-[#7A021D]">
                            {formatRupees(m.credit_balance_minor)}
                          </td>
                          <td className="px-5 py-4 text-xs text-neutral-600">
                            {new Date(m.activated_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-5 py-4 text-xs text-neutral-500">
                            {m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => void handleAdjustCredit(m)}
                              disabled={rowBusy === m.id}
                              className="rounded-lg bg-[#FDF8F4] px-2.5 py-1 text-xs font-semibold text-[#7A021D] hover:bg-[#7A021D] hover:text-white transition-colors"
                            >
                              Edit Credit
                            </button>
                            {m.status === 'active' && (
                              <button
                                onClick={() => void handleStatusChange(m.id, 'paused')}
                                disabled={rowBusy === m.id}
                                className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                              >
                                Pause
                              </button>
                            )}
                            {m.status === 'paused' && (
                              <button
                                onClick={() => void handleStatusChange(m.id, 'active')}
                                disabled={rowBusy === m.id}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                Resume
                              </button>
                            )}
                            {(m.status === 'active' || m.status === 'paused') && (
                              <button
                                onClick={() => void handleStatusChange(m.id, 'cancelled')}
                                disabled={rowBusy === m.id}
                                className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-5 flex items-center justify-between text-sm text-neutral-600">
              <div>{loading ? 'Loading…' : `${total} membership${total === 1 ? '' : 's'}`}</div>
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
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 2: MEMBERSHIP TIERS MANAGEMENT
        ══════════════════════════════════════ */}
        {mainTab === 'tiers' && (
          <div>
            {loadingPlans ? (
              <div className="py-12 text-center text-[#2C0505]">Loading membership tiers…</div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF8F4] text-2xl border border-[#7A021D]/20 shadow-2xs">
                            {p.slug === 'the_atelier' ? '✨' : '📩'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-[#2C0505]">{p.name}</h3>
                              {p.badge && (
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    p.is_popular ? 'bg-[#7A021D] text-white' : 'bg-neutral-100 text-neutral-700'
                                  }`}
                                >
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">{p.tagline || p.slug}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => openEditPlan(p)}
                          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-[#7A021D] hover:bg-[#FDF8F4] transition-colors shadow-2xs"
                        >
                          Edit Tier
                        </button>
                      </div>

                      {/* Pricing & Credit Summary */}
                      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Monthly Price</p>
                          <p className="text-base font-extrabold text-[#2C0505]">
                            {p.price_minor === 0 ? 'Free' : formatRupees(p.price_minor)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A021D]">Returned Credit</p>
                          <p className="text-base font-extrabold text-[#7A021D]">
                            {formatRupees(p.default_credit_minor)}
                          </p>
                        </div>
                      </div>

                      {p.description && (
                        <p className="mt-4 text-xs text-neutral-600 leading-relaxed">{p.description}</p>
                      )}

                      {/* Features */}
                      {p.features && p.features.length > 0 && (
                        <div className="mt-4 border-t border-neutral-100 pt-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Included Features</p>
                          <ul className="space-y-1.5">
                            {p.features.map((feat, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                                <span className="text-[#7A021D] font-bold">✓</span>
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                      <span>Slug: <code className="font-mono text-neutral-600">{p.slug}</code></span>
                      <button
                        onClick={() => openEditPlan(p)}
                        className="font-bold text-[#7A021D] hover:underline"
                      >
                        Manage Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Drawers ── */}
      {isActivateDrawerOpen && (
        <ActivateMembershipDrawer
          onClose={() => setIsActivateDrawerOpen(false)}
          onSuccess={() => {
            setIsActivateDrawerOpen(false);
            void loadMemberships();
          }}
        />
      )}

      {isPlanDrawerOpen && (
        <MembershipPlanDrawer
          initialPlan={selectedPlanForEdit}
          onClose={() => setIsPlanDrawerOpen(false)}
          onSuccess={() => {
            setIsPlanDrawerOpen(false);
            void loadPlans();
          }}
        />
      )}
    </>
  );
}
