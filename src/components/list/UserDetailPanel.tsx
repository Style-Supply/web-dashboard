'use client';

import Link from 'next/link';
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
          <div className="flex items-center gap-2">
            <Link
              href={`/users/${user.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A021D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6B0019]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </Link>
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
        </div>

        <div className="flex flex-col gap-8 px-6 py-6">
          <Section title="Contact">
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phone_number} />
            <Field label="Instagram" value={user.instagram_handle} />
            <Field label="Referral Code" value={user.referral_code} />
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

          {(() => {
            const topList = (user.top_sizes && user.top_sizes.length > 0)
              ? user.top_sizes
              : (user.morning_routine_selections || []).filter((s) => s.startsWith('top:')).map((s) => s.replace('top:', ''));
            const bottomList = (user.bottom_sizes && user.bottom_sizes.length > 0)
              ? user.bottom_sizes
              : (user.morning_routine_selections || []).filter((s) => s.startsWith('bottom:')).map((s) => s.replace('bottom:', ''));
            const dressList = (user.dress_sizes && user.dress_sizes.length > 0)
              ? user.dress_sizes
              : (user.morning_routine_selections || []).filter((s) => s.startsWith('dress:')).map((s) => s.replace('dress:', ''));

            return (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#7A021D]">
                  Usual Sizes
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">Top</div>
                    {topList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {topList.map((s) => (
                          <span key={s} className="rounded-full bg-[#FDF8F4] px-2.5 py-0.5 text-xs font-semibold text-[#7A021D]">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">—</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">Bottom</div>
                    {bottomList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {bottomList.map((s) => (
                          <span key={s} className="rounded-full bg-[#FDF8F4] px-2.5 py-0.5 text-xs font-semibold text-[#7A021D]">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">—</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">Dress</div>
                    {dressList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {dressList.map((s) => (
                          <span key={s} className="rounded-full bg-[#FDF8F4] px-2.5 py-0.5 text-xs font-semibold text-[#7A021D]">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">—</div>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#7A021D]">
              Discovery & Social Profile
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="How they heard about us" value={user.hear_about_us} />
              <Field label="Event Attendance" value={user.event_frequency} />
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
                Private Club Memberships
              </div>
              {user.private_clubs && user.private_clubs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {user.private_clubs.map((club) => (
                    <span
                      key={club}
                      className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-800"
                    >
                      {club === 'Other' && user.other_club ? `Other (${user.other_club})` : club}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-500">None selected</div>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#7A021D]">
              Style Preferences
            </h3>
            {(() => {
              const prefList = (user.dressing_preferences && user.dressing_preferences.length > 0)
                ? user.dressing_preferences
                : (user.morning_routine_selections || []).filter((s) => !s.startsWith('top:') && !s.startsWith('bottom:') && !s.startsWith('dress:'));

              if (prefList.length === 0) {
                return <div className="text-sm text-neutral-500">None selected</div>;
              }

              return (
                <div className="flex flex-wrap gap-2">
                  {prefList.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#FDF8F4] px-3 py-1 text-xs font-medium text-[#7A021D]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              );
            })()}
          </section>
        </div>
      </aside>
    </div>
  );
}
