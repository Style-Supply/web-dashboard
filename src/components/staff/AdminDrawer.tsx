'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createAdmin, updateAdmin } from '@/lib/users';
import type { OnboardingSubmission } from '@/types/user';

interface Props {
  mode: 'create' | 'edit';
  initial?: OnboardingSubmission;
  onClose: () => void;
  onSuccess: (admin: OnboardingSubmission) => void;
  onDelete?: (id: string, name: string) => void;
}

function Toggle({
  checked,
  onChange,
  color = 'emerald',
}: {
  checked: boolean;
  onChange: () => void;
  color?: string;
}) {
  const onColor =
    color === 'red'
      ? 'bg-red-500'
      : color === 'amber'
      ? 'bg-amber-500'
      : color === 'blue'
      ? 'bg-blue-500'
      : 'bg-emerald-500';

  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? onColor : 'bg-neutral-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function AdminDrawer({
  mode,
  initial,
  onClose,
  onSuccess,
  onDelete,
}: Props): React.ReactElement {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Clean form fields
  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone_number ?? '');
  const [password, setPassword] = useState('');
  const [adminNotes, setAdminNotes] = useState(initial?.admin_notes ?? '');
  const [isActive, setIsActive] = useState(
    initial ? initial.approval_status !== 'rejected' : true,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('error', 'Full name and email are required');
      return;
    }

    if (mode === 'create' && password && password.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        const created = await createAdmin({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
          admin_notes: adminNotes.trim() || 'System Administrator Account',
          is_active: isActive,
        });
        showToast('success', `Admin account created for ${fullName.trim()}!`);
        onSuccess(created);
      } else if (initial) {
        const updated = await updateAdmin(initial.id, {
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          admin_notes: adminNotes.trim() || undefined,
          is_active: isActive,
        });
        showToast('success', 'Admin account updated successfully');
        onSuccess(updated);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight .22s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-2xl shadow-xs">
              👑
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {mode === 'create' ? 'Add Admin Account' : 'Edit Admin Account'}
              </h2>
              <p className="text-xs text-white/60">
                {mode === 'create'
                  ? 'Create a system administrator with full dashboard access'
                  : initial?.full_name || 'Update administrator details'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'edit' && initial && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(initial.id, initial.full_name);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors"
              >
                Delete
              </button>
            )}

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
        </div>

        {/* ── Form Body ── */}
        <form id="admin-form" onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              Administrator Identity & Access
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-neutral-700">Full Name *</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexandra Chen"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-medium text-[#2C0505] shadow-2xs focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-neutral-700">Email Address *</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mode === 'edit'}
                  placeholder="admin@stylesupply.io"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-medium text-[#2C0505] shadow-2xs focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none disabled:bg-neutral-100 disabled:text-neutral-400"
                />
                {mode === 'edit' && (
                  <span className="text-[11px] text-neutral-400">Email cannot be changed after creation.</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-neutral-700">Phone Number (Optional)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-medium text-[#2C0505] shadow-2xs focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none"
                />
              </label>

              {mode === 'create' && (
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-semibold text-neutral-700">Initial Password (Optional)</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for auto-generated default password"
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-medium text-[#2C0505] shadow-2xs focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none"
                  />
                  <span className="text-[11px] text-neutral-400">
                    Default password: <code>AdminStyleSupply2026!</code>
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Section 2: Account Status & Notes */}
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              Operational Details
            </h3>

            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
              <div>
                <p className="text-xs font-bold text-[#2C0505]">
                  Account {isActive ? 'Active' : 'Suspended'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {isActive
                    ? 'Admin currently has full access to dashboard'
                    : 'Admin dashboard login is suspended'}
                </p>
              </div>
              <Toggle checked={isActive} onChange={() => setIsActive((v) => !v)} color="emerald" />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-neutral-700">Admin Role / Internal Notes</span>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Lead Operations Director, StyleSupply Tech Team"
                className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm font-medium text-[#2C0505] shadow-2xs focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none"
              />
            </label>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800">
            🔒 <strong>Admin Privileges</strong>: Administrators have full, unrestricted access to all dashboard resources, inventory, financial reports, and staff management.
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
            form="admin-form"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-all shadow-md"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : mode === 'create' ? (
              'Create Admin Account'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      ` }} />
    </>
  );
}
