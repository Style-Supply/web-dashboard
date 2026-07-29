'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listUsers } from '@/lib/users';
import { createMembership } from '@/lib/memberships';
import type { OnboardingSubmission } from '@/types/user';

interface ActivateMembershipDrawerProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PLAN_CARDS = [
  {
    id: 'the_invitation',
    title: 'The Invitation',
    badge: 'Free Access',
    price: 'Free by request',
    desc: 'Full catalogue access, try/rent/buy from any label with private account',
    icon: '📩',
    defaultCredit: '0',
    features: ['Full catalogue access', 'Private account', 'Try, rent or buy'],
  },
  {
    id: 'the_atelier',
    title: 'The Atelier',
    badge: 'Best Value',
    price: '₹5,000 / month',
    desc: 'Personal stylist & concierge, extended rental windows, 100% fee returned as credit',
    icon: '✨',
    defaultCredit: '5000',
    features: ['Personal stylist & concierge', 'Extended rental windows', 'Fee returns as credit'],
  },
];

const CREDIT_PRESETS = ['0', '5000', '10000', '15000'];

function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

export default function ActivateMembershipDrawer({
  onClose,
  onSuccess,
}: ActivateMembershipDrawerProps): React.ReactElement {
  const { showToast } = useToast();
  const [users, setUsers] = useState<OnboardingSubmission[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [plan, setPlan] = useState('the_atelier');
  const [creditRupees, setCreditRupees] = useState('5000');
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadUserList() {
      setLoadingUsers(true);
      try {
        const res = await listUsers({ limit: 100 });
        setUsers(res.users);
        if (res.users.length > 0) {
          setSelectedUserId(res.users[0].id);
        }
      } catch (err) {
        showToast('error', 'Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    }
    void loadUserList();
  }, [showToast]);

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!selectedUserId) {
      showToast('error', 'Please select a user');
      return;
    }

    const rupees = Number(creditRupees);
    if (!Number.isFinite(rupees) || rupees < 0) {
      showToast('error', 'Please enter a valid credit amount in ₹');
      return;
    }

    setSubmitting(true);
    try {
      await createMembership({
        user_id: selectedUserId,
        plan,
        credit_balance_minor: Math.round(rupees * 100),
        status,
      });
      showToast('success', 'Membership activated successfully');
      onSuccess();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight .22s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white font-bold text-base shadow-xs">
              💳
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Activate Membership Tier</h2>
              <p className="text-xs text-white/60">Choose between The Invitation or The Atelier</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Form Body ── */}
        <form id="activate-membership-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Section 1: User Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              1. Select Member *
            </label>

            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs shadow-xs focus:border-[#7A021D] focus:outline-none focus:ring-1 focus:ring-[#7A021D]"
              />
            </div>

            {loadingUsers ? (
              <div className="py-3 text-center text-xs text-neutral-400">Loading user directory…</div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-medium text-[#2C0505] shadow-xs outline-none focus:border-[#7A021D]"
              >
                {filteredUsers.length === 0 ? (
                  <option value="">No matching users found</option>
                ) : (
                  filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.email} ({u.approval_status ?? 'pending'})
                    </option>
                  ))
                )}
              </select>
            )}

            {/* Selected User Preview Card */}
            {selectedUser && (
              <div className="mt-1 flex items-center gap-3 rounded-xl border border-[#7A021D]/20 bg-[#FDF8F4] p-3 shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7A021D] text-white font-bold text-xs">
                  {userInitials(selectedUser.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#2C0505] truncate">{selectedUser.full_name}</p>
                  <p className="text-[11px] text-neutral-500 truncate">{selectedUser.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Ready
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Membership Tier Cards */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              2. Select Membership Plan (2 Tiers) *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {PLAN_CARDS.map((card) => {
                const active = plan === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setPlan(card.id);
                      setCreditRupees(card.defaultCredit);
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      active
                        ? 'border-[#7A021D] bg-[#FDF8F4] ring-2 ring-[#7A021D]/30 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-2xs border border-neutral-200">
                          {card.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#2C0505]">{card.title}</h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                card.id === 'the_atelier'
                                  ? 'bg-[#7A021D] text-white'
                                  : 'bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {card.badge}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[#7A021D] mt-0.5">{card.price}</p>
                        </div>
                      </div>

                      <input
                        type="radio"
                        checked={active}
                        onChange={() => {}}
                        className="h-4 w-4 accent-[#7A021D] mt-1"
                      />
                    </div>

                    <p className="mt-2.5 text-xs text-neutral-600 leading-relaxed">{card.desc}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-neutral-200/60">
                      {card.features.map((feat) => (
                        <span key={feat} className="rounded-md bg-white border border-neutral-200/80 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Credit Balance Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              3. Initial Credit Balance (₹) *
            </label>

            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              {CREDIT_PRESETS.map((preset) => {
                const active = creditRupees === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCreditRupees(preset)}
                    className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? 'border-[#7A021D] bg-[#7A021D] text-white shadow-xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#7A021D]'
                    }`}
                  >
                    {preset === '0' ? '₹0 Free' : `₹${Number(preset).toLocaleString('en-IN')}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-500">₹</span>
              <input
                type="number"
                min="0"
                step="500"
                value={creditRupees}
                onChange={(e) => setCreditRupees(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-8 pr-4 text-sm font-bold text-[#2C0505] shadow-xs outline-none focus:border-[#7A021D]"
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              For <strong>The Atelier</strong>, member fee of ₹5,000/mo is 100% credited to their balance.
            </p>
          </div>

          {/* Section 4: Initial Status */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              4. Activation Status *
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  status === 'active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                🟢 Active Immediately
              </button>
              <button
                type="button"
                onClick={() => setStatus('paused')}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  status === 'paused'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                🟡 Paused On Hold
              </button>
            </div>
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="activate-membership-form"
            disabled={submitting || !selectedUserId}
            className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-all shadow-md"
          >
            {submitting ? 'Activating…' : 'Activate Membership'}
          </button>
        </div>
      </div>

      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      ` }} />
    </>
  );
}
