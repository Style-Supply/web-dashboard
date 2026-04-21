'use client';

import { useEffect } from 'react';
import type { OnboardingSubmission } from '@/types/user';

interface UserDetailPanelProps {
  user: OnboardingSubmission;
  onClose: () => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMeasurement(value: number | null, unit: string | null): string {
  if (value === null || value === undefined) return '—';
  return unit ? `${value} ${unit}` : `${value}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 text-sm text-[#2C0505]">{value || '—'}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#7A021D]">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

export default function UserDetailPanel({ user, onClose }: UserDetailPanelProps): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-[#2C0505]">{user.full_name}</h2>
            <div className="mt-0.5 text-xs text-neutral-500">
              Signed up {formatDateTime(user.created_at)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-[#2C0505]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-8 px-6 py-6">
          <Section title="Contact">
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phone_number} />
            <Field label="Instagram" value={user.instagram_handle} />
            <Field
              label="Status"
              value={
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.approval_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : user.approval_status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {user.approval_status ?? 'pending'}
                </span>
              }
            />
          </Section>

          <Section title="Address">
            <Field label="Apartment / Floor" value={user.floor_apartment} />
            <Field label="City" value={user.city} />
            <Field label="PIN Code" value={user.zip_code} />
          </Section>

          <Section title="Fit Profile">
            <Field label="Age" value={formatMeasurement(user.age_value, user.age_unit)} />
            <Field label="Height" value={formatMeasurement(user.height_value, user.height_unit)} />
            <Field label="Shoulder" value={formatMeasurement(user.shoulder_width_value, user.shoulder_width_unit)} />
            <Field label="Bust" value={formatMeasurement(user.bust_size_value, user.bust_size_unit)} />
            <Field label="Waist" value={formatMeasurement(user.waist_size_value, user.waist_size_unit)} />
            <Field label="Hips" value={formatMeasurement(user.hips_size_value, user.hips_size_unit)} />
          </Section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#7A021D]">
              Style Preferences
            </h3>
            {user.morning_routine_selections && user.morning_routine_selections.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.morning_routine_selections.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#FDF8F4] px-3 py-1 text-xs font-medium text-[#7A021D]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">None selected</div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
