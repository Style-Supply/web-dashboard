'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  createUser,
  deleteUser,
  updateUser,
  approveAccessRequest,
  rejectAccessRequest,
  waitlistAccessRequest,
  type UserPayload,
} from '@/lib/users';
import type { OnboardingSubmission } from '@/types/user';

type Mode = 'create' | 'edit';

interface UserFormProps {
  mode: Mode;
  initial?: OnboardingSubmission;
  onSuccess?: () => void;
  onClose?: () => void;
}

const STATUS_OPTIONS = ['pending', 'approved', 'waitlisted', 'rejected'] as const;
const HEIGHT_UNITS = ['cm', 'ft'] as const;
const BODY_UNITS = ['cm', 'in'] as const;
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const CLUB_OPTIONS = ['Soho House', 'Bastian', 'The Chambers', 'Willingdon Club', 'Bay Club', 'Other'] as const;

const STYLE_TAGS = [
  'plan',
  'instinct',
  'uniform',
  'guide',
  'occasion',
  'scroll',
  'chaos',
  'rewear',
] as const;

const STYLE_MAP: Record<string, string> = {
  plan: 'I plan ahead',
  instinct: 'I go on instinct',
  uniform: 'I have a uniform',
  guide: 'I need a guide',
  occasion: 'Occasion decides',
  scroll: 'I scroll, then decide',
  chaos: 'Organised chaos',
  rewear: 'I rewear faithfully',
};

function calculateAgeFromDob(dobStr?: string | null): number | null {
  if (!dobStr || !dobStr.trim()) return null;
  const birthDate = new Date(dobStr.trim());
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function toNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function fromNum(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export default function UserForm({ mode, initial, onSuccess, onClose }: UserFormProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone_number ?? '');
  const [instagram, setInstagram] = useState(initial?.instagram_handle ?? '');
  const [referralCode, setReferralCode] = useState(initial?.referral_code ?? '');
  const [approvalStatus, setApprovalStatus] = useState<string>(
    initial?.approval_status ?? 'pending',
  );
  const [role, setRole] = useState<'user' | 'admin'>(initial?.role === 'admin' ? 'admin' : 'user');

  const [apartment, setApartment] = useState(initial?.floor_apartment ?? '');
  const [city, setCity] = useState(initial?.city ?? 'Mumbai');
  const [zip, setZip] = useState(initial?.zip_code ?? '');
  const [dob, setDob] = useState(() => {
    if (initial?.dob && initial.dob.trim()) return initial.dob.trim();
    if (initial?.admin_notes) {
      const match = initial.admin_notes.match(/\[DOB:\s*([^\]]+)\]/i);
      if (match) return match[1].trim();
    }
    return '';
  });

  const [age, setAge] = useState(() => {
    const computed = calculateAgeFromDob(dob);
    if (computed !== null) return String(computed);
    return fromNum(initial?.age_value);
  });
  const [ageUnit, setAgeUnit] = useState(initial?.age_unit ?? 'years');
  const [height, setHeight] = useState(fromNum(initial?.height_value));
  const [heightUnit, setHeightUnit] = useState(initial?.height_unit ?? 'cm');
  const [shoulder, setShoulder] = useState(fromNum(initial?.shoulder_width_value));
  const [shoulderUnit, setShoulderUnit] = useState(initial?.shoulder_width_unit ?? 'in');
  const [bust, setBust] = useState(fromNum(initial?.bust_size_value));
  const [bustUnit, setBustUnit] = useState(initial?.bust_size_unit ?? 'in');
  const [waist, setWaist] = useState(fromNum(initial?.waist_size_value));
  const [waistUnit, setWaistUnit] = useState(initial?.waist_size_unit ?? 'in');
  const [hips, setHips] = useState(fromNum(initial?.hips_size_value));
  const [hipsUnit, setHipsUnit] = useState(initial?.hips_size_unit ?? 'in');

  // Sizes
  const [topSizes, setTopSizes] = useState<string[]>(() => {
    if (initial?.top_sizes && initial.top_sizes.length > 0) return initial.top_sizes;
    return (initial?.morning_routine_selections || [])
      .filter((s) => s.startsWith('top:'))
      .map((s) => s.replace('top:', ''));
  });
  const [bottomSizes, setBottomSizes] = useState<string[]>(() => {
    if (initial?.bottom_sizes && initial.bottom_sizes.length > 0) return initial.bottom_sizes;
    return (initial?.morning_routine_selections || [])
      .filter((s) => s.startsWith('bottom:'))
      .map((s) => s.replace('bottom:', ''));
  });
  const [dressSizes, setDressSizes] = useState<string[]>(() => {
    if (initial?.dress_sizes && initial.dress_sizes.length > 0) return initial.dress_sizes;
    return (initial?.morning_routine_selections || [])
      .filter((s) => s.startsWith('dress:'))
      .map((s) => s.replace('dress:', ''));
  });

  // Discovery & Clubs
  const [hearAboutUs, setHearAboutUs] = useState(initial?.hear_about_us ?? '');
  const [eventFrequency, setEventFrequency] = useState(initial?.event_frequency ?? '');
  const [privateClubs, setPrivateClubs] = useState<string[]>(initial?.private_clubs ?? []);
  const [otherClub, setOtherClub] = useState(initial?.other_club ?? '');

  // Style Preferences & Admin Notes
  const [styles, setStyles] = useState<string[]>(() => {
    if (initial?.dressing_preferences && initial.dressing_preferences.length > 0) {
      return initial.dressing_preferences;
    }
    return (initial?.morning_routine_selections || []).filter(
      (s) => !s.startsWith('top:') && !s.startsWith('bottom:') && !s.startsWith('dress:')
    );
  });
  const [adminNotes, setAdminNotes] = useState(() => {
    const raw = initial?.admin_notes ?? '';
    return raw.replace(/\[DOB:\s*[^\]]+\]/gi, '').trim();
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('error', 'Name and email are required');
      return;
    }

    const dobValue = dob.trim();
    const dobTag = dobValue ? `[DOB: ${dobValue}]` : '';
    const cleanAdminNotes = adminNotes.replace(/\[DOB:\s*[^\]]+\]/gi, '').trim();
    const finalAdminNotes = [cleanAdminNotes, dobTag].filter(Boolean).join(' ').trim();

    const payload: UserPayload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone_number: phone.trim() || null,
      floor_apartment: apartment.trim() || '',
      city: city.trim() || '',
      zip_code: zip.trim() || '',
      instagram_handle: instagram.trim() || '',
      referral_code: referralCode.trim() || '',
      dob: dobValue,
      height_value: toNum(height),
      height_unit: heightUnit || null,
      shoulder_width_value: toNum(shoulder),
      shoulder_width_unit: shoulderUnit || null,
      bust_size_value: toNum(bust),
      bust_size_unit: bustUnit || null,
      waist_size_value: toNum(waist),
      waist_size_unit: waistUnit || null,
      hips_size_value: toNum(hips),
      hips_size_unit: hipsUnit || null,
      age_value: toNum(age),
      age_unit: ageUnit || null,
      top_sizes: topSizes,
      bottom_sizes: bottomSizes,
      dress_sizes: dressSizes,
      hear_about_us: hearAboutUs.trim() || '',
      event_frequency: eventFrequency.trim() || '',
      private_clubs: privateClubs,
      other_club: otherClub.trim() || '',
      morning_routine_selections: styles,
      approval_status: initial?.approval_status ?? (role === 'admin' ? 'approved' : 'pending'),
      admin_notes: finalAdminNotes || (role === 'admin' ? 'Administrator Account' : ''),
      role,
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await createUser(payload);
        showToast('success', 'User created');
      } else if (initial) {
        await updateUser(initial.id, payload);

        const statusChanged = approvalStatus !== (initial.approval_status ?? 'pending');
        if (statusChanged) {
          if (approvalStatus === 'approved') {
            const res = await approveAccessRequest(initial.id);
            showToast(
              res.email_sent ? 'success' : 'error',
              res.email_sent
                ? 'User approved — invite email sent'
                : `User approved — invite NOT sent. Share code manually: ${res.access_code}`,
            );
          } else if (approvalStatus === 'rejected') {
            await rejectAccessRequest(initial.id, adminNotes);
            showToast('success', 'User updated & rejected');
          } else if (approvalStatus === 'waitlisted') {
            await waitlistAccessRequest(initial.id, adminNotes);
            showToast('success', 'User updated & waitlisted');
          } else {
            showToast('success', 'User updated');
          }
        } else {
          showToast('success', 'User updated');
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/users');
        router.refresh();
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!initial) return;
    if (!confirm(`Delete ${initial.full_name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteUser(initial.id);
      showToast('success', 'User deleted');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/users');
        router.refresh();
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  const formFieldsContent = (
    <div className="flex flex-col gap-6">
      <Section title="Contact & Credentials">
        <LabeledInput label="Full name *" value={fullName} onChange={setFullName} />
        <LabeledInput label="Email *" value={email} onChange={setEmail} type="email" />
        <LabeledInput label="Phone" value={phone} onChange={setPhone} />
        <LabeledInput label="Instagram handle" value={instagram} onChange={setInstagram} />
        <LabeledInput label="Referral code" value={referralCode} onChange={setReferralCode} />
        <LabeledSelect
          label="Account role"
          value={role}
          onChange={(v) => setRole(v as 'user' | 'admin')}
          options={['user', 'admin']}
        />
        <LabeledSelect
          label="Approval status"
          value={approvalStatus}
          onChange={setApprovalStatus}
          options={[...STATUS_OPTIONS]}
        />
        {initial?.invite_code && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#2C0505]/70">Invite Code</span>
            <div className="h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-mono font-semibold text-[#7A021D]">
              {initial.invite_code}
            </div>
          </div>
        )}
      </Section>

      <Section title="Location & Address">
        <LabeledInput
          label="Floor / apartment"
          value={apartment}
          onChange={setApartment}
        />
        <LabeledInput label="City" value={city} onChange={setCity} />
        <LabeledInput label="PIN code" value={zip} onChange={setZip} />
      </Section>

      {role !== 'admin' && (
        <>
          <Section title="Fit profile & Measurements">
            <LabeledInput
              label="Date of Birth (D.O.B)"
              type="date"
              value={dob}
              onChange={(val) => {
                setDob(val);
                const computed = calculateAgeFromDob(val);
                if (computed !== null) {
                  setAge(String(computed));
                }
              }}
            />
            <MeasurementField
              label="Age"
              value={age}
              unit={ageUnit}
              onValueChange={setAge}
              onUnitChange={setAgeUnit}
              units={['years']}
            />
            <MeasurementField
              label="Height"
              value={height}
              unit={heightUnit}
              onValueChange={setHeight}
              onUnitChange={setHeightUnit}
              units={[...HEIGHT_UNITS]}
            />
            <MeasurementField
              label="Shoulder"
              value={shoulder}
              unit={shoulderUnit}
              onValueChange={setShoulder}
              onUnitChange={setShoulderUnit}
              units={[...BODY_UNITS]}
            />
            <MeasurementField
              label="Bust"
              value={bust}
              unit={bustUnit}
              onValueChange={setBust}
              onUnitChange={setBustUnit}
              units={[...BODY_UNITS]}
            />
            <MeasurementField
              label="Waist"
              value={waist}
              unit={waistUnit}
              onValueChange={setWaist}
              onUnitChange={setWaistUnit}
              units={[...BODY_UNITS]}
            />
            <MeasurementField
              label="Hips"
              value={hips}
              unit={hipsUnit}
              onValueChange={setHips}
              onUnitChange={setHipsUnit}
              units={[...BODY_UNITS]}
            />
          </Section>

          {/* Usual Sizes */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#7A021D]">
              Usual Sizes
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-xs font-medium text-[#2C0505]/70 block mb-1">Top</span>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_OPTIONS.map((sz) => {
                    const active = topSizes.includes(sz);
                    return (
                      <button
                        key={`top-${sz}`}
                        type="button"
                        onClick={() => toggleArrayItem(topSizes, sz, setTopSizes)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#7A021D] bg-[#7A021D] text-white font-semibold'
                            : 'border-neutral-200 bg-white text-[#2C0505] hover:border-[#7A021D]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-[#2C0505]/70 block mb-1">Bottom</span>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_OPTIONS.map((sz) => {
                    const active = bottomSizes.includes(sz);
                    return (
                      <button
                        key={`bottom-${sz}`}
                        type="button"
                        onClick={() => toggleArrayItem(bottomSizes, sz, setBottomSizes)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#7A021D] bg-[#7A021D] text-white font-semibold'
                            : 'border-neutral-200 bg-white text-[#2C0505] hover:border-[#7A021D]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-[#2C0505]/70 block mb-1">Dress</span>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_OPTIONS.map((sz) => {
                    const active = dressSizes.includes(sz);
                    return (
                      <button
                        key={`dress-${sz}`}
                        type="button"
                        onClick={() => toggleArrayItem(dressSizes, sz, setDressSizes)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#7A021D] bg-[#7A021D] text-white font-semibold'
                            : 'border-neutral-200 bg-white text-[#2C0505] hover:border-[#7A021D]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Discovery & Social Profile */}
          <Section title="Discovery & Memberships">
            <LabeledInput
              label="How did they hear about us?"
              value={hearAboutUs}
              onChange={setHearAboutUs}
            />
            <LabeledInput
              label="Event frequency"
              value={eventFrequency}
              onChange={setEventFrequency}
            />
            <div className="col-span-2">
              <span className="text-xs font-medium text-[#2C0505]/70 block mb-1">Private Clubs</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CLUB_OPTIONS.map((club) => {
                  const active = privateClubs.includes(club);
                  return (
                    <button
                      key={club}
                      type="button"
                      onClick={() => toggleArrayItem(privateClubs, club, setPrivateClubs)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-[#7A021D] bg-[#7A021D] text-white font-semibold'
                          : 'border-neutral-200 bg-white text-[#2C0505] hover:border-[#7A021D]'
                      }`}
                    >
                      {club}
                    </button>
                  );
                })}
              </div>
              {privateClubs.includes('Other') && (
                <LabeledInput
                  label="Other club details"
                  value={otherClub}
                  onChange={setOtherClub}
                />
              )}
            </div>
          </Section>

          {/* Style Preferences */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#7A021D]">
              Style preferences
            </h2>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => {
                const active = styles.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleArrayItem(styles, tag, setStyles)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#7A021D] bg-[#7A021D] text-white font-semibold'
                        : 'border-neutral-200 bg-white text-[#2C0505] hover:border-[#7A021D] hover:text-[#7A021D]'
                    }`}
                  >
                    {STYLE_MAP[tag] || tag}
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Admin Notes */}
      <section className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#2C0505]/70">Admin Notes</span>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Internal admin notes regarding this user..."
          rows={3}
          className="w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D]"
        />
      </section>
    </div>
  );

  // If in slide-over popup drawer mode
  if (onClose) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl"
          style={{ animation: 'slideInRight .22s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">
                👤
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {mode === 'create' ? 'Add User' : 'Edit User'}
                </h2>
                <p className="text-xs text-white/50 mt-0.5">
                  {mode === 'create' ? 'Create a new user account' : (initial?.full_name || 'User details')}
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
                  {deleting ? 'Deleting…' : 'Delete'}
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

          {/* Body */}
          <form id="user-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {formFieldsContent}
          </form>

          {/* Footer */}
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
              form="user-drawer-form"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
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

  // Standalone page mode
  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/users"
            className="text-xs text-neutral-500 hover:text-[#7A021D]"
          >
            ← Back to Users
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-[#2C0505]">
            {mode === 'create' ? 'Add User' : 'Edit User'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleDelete()}
              loading={deleting}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {mode === 'create' ? 'Create' : 'Save changes'}
          </Button>
        </div>
      </div>

      {formFieldsContent}
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#7A021D]">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}): React.ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#2C0505]/70">{label}</span>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}): React.ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#2C0505]/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function convertHeight(value: string, fromUnit: string, toUnit: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed || isNaN(parseFloat(trimmed))) return value;
  const num = parseFloat(trimmed);
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'cm' && toUnit === 'ft') {
    const ft = num / 30.48;
    return String(Math.round(ft * 10) / 10);
  }
  if (fromUnit === 'ft' && toUnit === 'cm') {
    const cm = num * 30.48;
    return String(Math.round(cm));
  }
  return value;
}

function convertMeasurement(value: string, fromUnit: string, toUnit: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed || isNaN(parseFloat(trimmed))) return value;
  const num = parseFloat(trimmed);
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'cm' && toUnit === 'in') {
    const inches = num / 2.54;
    const rounded = Math.round(inches * 10) / 10;
    return String(Number.isInteger(rounded) ? Math.round(rounded) : rounded);
  }
  if (fromUnit === 'in' && toUnit === 'cm') {
    const cm = num * 2.54;
    const rounded = Math.round(cm * 10) / 10;
    return String(Number.isInteger(rounded) ? Math.round(rounded) : rounded);
  }
  return value;
}

function MeasurementField({
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  units,
}: {
  label: string;
  value: string;
  unit: string;
  onValueChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  units: string[];
}): React.ReactElement {
  const handleUnitChange = (nextUnit: string) => {
    if (nextUnit === unit) return;
    let nextVal = value;
    if ((unit === 'cm' || unit === 'ft') && (nextUnit === 'cm' || nextUnit === 'ft')) {
      nextVal = convertHeight(value, unit, nextUnit);
    } else if ((unit === 'cm' || unit === 'in') && (nextUnit === 'cm' || nextUnit === 'in')) {
      nextVal = convertMeasurement(value, unit, nextUnit);
    }
    onValueChange(nextVal);
    onUnitChange(nextUnit);
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#2C0505]/70">{label}</span>
      <div className="flex gap-2">
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="flex-1"
        />
        <select
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="h-10 w-20 rounded-lg border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D]"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
