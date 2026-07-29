'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  createManager,
  updateManager,
  updateManagerPermissions,
  deleteManager,
  getPresets,
  buildDefaultPermissions,
  ALL_RESOURCES,
  RESOURCE_LABELS,
  type StaffMember,
  type ResourcePermission,
  type ManagedResource,
  type PermissionPresets,
} from '@/lib/staff';

interface Props {
  mode: 'create' | 'edit';
  initial?: StaffMember;
  onClose: () => void;
  onSuccess: (manager: StaffMember) => void;
}

const ACTIONS: Array<{ key: keyof ResourcePermission; label: string; color: string }> = [
  { key: 'can_view',   label: 'View',   color: 'emerald' },
  { key: 'can_create', label: 'Create', color: 'blue' },
  { key: 'can_edit',   label: 'Edit',   color: 'amber' },
  { key: 'can_delete', label: 'Delete', color: 'red' },
];

function Toggle({ checked, onChange, color = 'emerald' }: { checked: boolean; onChange: () => void; color?: string }) {
  const onColor = color === 'red' ? 'bg-red-500' : color === 'amber' ? 'bg-amber-500' : color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500';
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

export default function ManagerDrawer({ mode, initial, onClose, onSuccess }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [presets, setPresets]   = useState<PermissionPresets>({});

  // Form fields
  const [fullName,   setFullName]   = useState(initial?.full_name   ?? '');
  const [email,      setEmail]      = useState(initial?.email       ?? '');
  const [phone,      setPhone]      = useState(initial?.phone       ?? '');
  const [department, setDepartment] = useState(initial?.department  ?? '');
  const [notes,      setNotes]      = useState(initial?.notes       ?? '');
  const [isActive,   setIsActive]   = useState(initial?.is_active   ?? true);

  // Permissions map: resource → per-action booleans
  const [perms, setPerms] = useState<Record<ManagedResource, ResourcePermission>>(() => {
    const defaults = buildDefaultPermissions();
    if (initial?.permissions) {
      for (const p of initial.permissions) {
        defaults[p.resource as ManagedResource] = p as ResourcePermission;
      }
    }
    return defaults;
  });

  // Load presets
  useEffect(() => {
    getPresets().then(({ presets }) => setPresets(presets)).catch(() => {});
  }, []);

  function applyPreset(presetName: string) {
    const preset = presets[presetName];
    if (!preset) return;
    setPerms((prev) => {
      const next = { ...prev };
      for (const resource of ALL_RESOURCES) {
        const override = preset[resource];
        if (override) {
          next[resource] = { ...next[resource], ...override };
        }
      }
      return next;
    });
  }

  function togglePerm(resource: ManagedResource, action: keyof ResourcePermission) {
    setPerms((prev) => ({
      ...prev,
      [resource]: { ...prev[resource], [action]: !prev[resource][action] },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('error', 'Full name and email are required');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        const result = await createManager({
          full_name:  fullName.trim(),
          email:      email.trim(),
          phone:      phone.trim() || undefined,
          department: department.trim() || undefined,
          notes:      notes.trim() || undefined,
          permissions: perms,
        });

        showToast('success',
          result.email_sent
            ? 'Manager created — invite emailed to them!'
            : result.temp_password
              ? `Manager created. Email failed — temp password: ${result.temp_password}`
              : 'Manager created.',
        );
        onSuccess(result.manager);
      } else if (initial) {
        const [{ manager }] = await Promise.all([
          updateManager(initial.id, { full_name: fullName.trim(), phone: phone.trim() || null, department: department.trim() || null, notes: notes.trim() || null, is_active: isActive }),
          updateManagerPermissions(initial.id, perms),
        ]);
        showToast('success', 'Manager updated');
        onSuccess(manager);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`Remove ${initial.full_name} as manager? Their account will be downgraded to a regular user.`)) return;
    setDeleting(true);
    try {
      await deleteManager(initial.id);
      showToast('success', 'Manager removed');
      onSuccess({ ...initial, is_active: false });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight .22s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-xl">🛠️</div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {mode === 'create' ? 'Add Manager' : 'Edit Manager'}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {mode === 'create' ? 'Create a staff account with controlled access' : (initial?.full_name || 'Update manager')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Remove Manager'}
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

        {/* ── Body ── */}
        <form id="manager-form" onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Section 1: Identity */}
          <section>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#7A021D]">Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Full Name *', value: fullName, setter: setFullName, type: 'text' },
                { label: 'Email *', value: email, setter: setEmail, type: 'email', disabled: mode === 'edit' },
                { label: 'Phone', value: phone, setter: setPhone, type: 'text' },
                { label: 'Department', value: department, setter: setDepartment, type: 'text', placeholder: 'e.g. Warehouse, Sales' },
              ].map(({ label, value, setter, type, disabled, placeholder }) => (
                <label key={label} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-neutral-600">{label}</span>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
                  />
                </label>
              ))}
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-medium text-neutral-600">Notes (internal)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none resize-none"
                />
              </label>
              {mode === 'edit' && (
                <label className="flex items-center gap-3 col-span-2">
                  <Toggle checked={isActive} onChange={() => setIsActive((v) => !v)} color="emerald" />
                  <span className="text-sm font-medium text-neutral-700">
                    Account {isActive ? 'Active' : 'Deactivated'}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {isActive ? 'Manager can currently log in' : 'Manager login is blocked'}
                  </span>
                </label>
              )}
            </div>
          </section>

          {/* Section 2: Permission Presets */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">Access Control</h3>
              {Object.keys(presets).length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Quick preset:</span>
                  {Object.keys(presets).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => applyPreset(name)}
                      className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-[#7A021D] hover:text-[#7A021D] transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-px bg-neutral-100 border-b border-neutral-200">
                <div className="bg-neutral-50 px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Resource</div>
                {ACTIONS.map(({ label }) => (
                  <div key={label} className="bg-neutral-50 px-3 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide text-center min-w-[64px]">{label}</div>
                ))}
              </div>

              {/* Permission rows */}
              {ALL_RESOURCES.map((resource) => (
                <div
                  key={resource}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-px border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition-colors"
                >
                  <div className="px-4 py-3 text-sm font-medium text-neutral-800">
                    {RESOURCE_LABELS[resource]}
                  </div>
                  {ACTIONS.map(({ key, color }) => (
                    <div key={key} className="flex items-center justify-center px-3 py-3 min-w-[64px]">
                      <Toggle
                        checked={perms[resource][key] as boolean}
                        onChange={() => togglePerm(resource, key)}
                        color={color}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              🔒 Staff management is always Admin-only and cannot be delegated to managers.
            </p>
          </section>
        </form>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="manager-form"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : mode === 'create' ? 'Create Manager' : 'Save Changes'}
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
