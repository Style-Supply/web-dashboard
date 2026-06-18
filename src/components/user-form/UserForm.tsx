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
}

const STATUS_OPTIONS = ['pending', 'approved', 'waitlisted', 'rejected'] as const;
const HEIGHT_UNITS = ['cm', 'ft'] as const;
const BODY_UNITS = ['cm', 'in'] as const;
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

function toNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function fromNum(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export default function UserForm({ mode, initial }: UserFormProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone_number ?? '');
  const [instagram, setInstagram] = useState(initial?.instagram_handle ?? '');
  const [approvalStatus, setApprovalStatus] = useState<string>(
    initial?.approval_status ?? 'pending',
  );

  const [apartment, setApartment] = useState(initial?.floor_apartment ?? '');
  const [city, setCity] = useState(initial?.city ?? 'Mumbai');
  const [zip, setZip] = useState(initial?.zip_code ?? '');

  const [age, setAge] = useState(fromNum(initial?.age_value));
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

  const [styles, setStyles] = useState<string[]>(initial?.morning_routine_selections ?? []);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleStyle = (tag: string): void => {
    setStyles((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('error', 'Full name and email are required');
      return;
    }

    // Approval status is NOT a plain field: changing it must run the real
    // onboarding actions (approve creates/links an auth user + sends the
    // invite; reject/waitlist set status). So we persist field edits without
    // approval_status, then apply any status change via the proper endpoint.
    const payload: UserPayload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone_number: phone.trim() || null,
      floor_apartment: apartment.trim() || null,
      city: city.trim() || null,
      zip_code: zip.trim() || null,
      instagram_handle: instagram.trim() || null,
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
      morning_routine_selections: styles,
      approval_status: initial?.approval_status ?? 'pending',
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await createUser(payload);
        showToast('success', 'User created');
      } else if (initial) {
        await updateUser(initial.id, payload);

        // If the admin changed the approval status, run the real action.
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
            await rejectAccessRequest(initial.id);
            showToast('success', 'User updated & rejected');
          } else if (approvalStatus === 'waitlisted') {
            await waitlistAccessRequest(initial.id);
            showToast('success', 'User updated & waitlisted');
          } else {
            showToast('success', 'User updated');
          }
        } else {
          showToast('success', 'User updated');
        }
      }
      router.push('/users');
      router.refresh();
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
      router.push('/users');
      router.refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

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

      <div className="flex flex-col gap-8">
        <Section title="Contact">
          <LabeledInput label="Full name *" value={fullName} onChange={setFullName} />
          <LabeledInput label="Email *" value={email} onChange={setEmail} type="email" />
          <LabeledInput label="Phone" value={phone} onChange={setPhone} />
          <LabeledInput label="Instagram handle" value={instagram} onChange={setInstagram} />
          <LabeledSelect
            label="Approval status"
            value={approvalStatus}
            onChange={setApprovalStatus}
            options={[...STATUS_OPTIONS]}
          />
        </Section>

        <Section title="Address">
          <LabeledInput
            label="Floor / apartment"
            value={apartment}
            onChange={setApartment}
          />
          <LabeledInput label="City" value={city} onChange={setCity} />
          <LabeledInput label="PIN code" value={zip} onChange={setZip} />
        </Section>

        <Section title="Fit profile">
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

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#7A021D]">
            Style preferences
          </h2>
          <div className="flex flex-wrap gap-2">
            {STYLE_TAGS.map((tag) => {
              const active = styles.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleStyle(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[#7A021D] bg-[#7A021D] text-white'
                      : 'border-neutral-200 bg-white text-[#2C0505] hover:border-[#7A021D] hover:text-[#7A021D]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>
      </div>
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#7A021D]">
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
        className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[color:var(--color-primary)]"
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
          onChange={(e) => onUnitChange(e.target.value)}
          className="h-10 w-20 rounded border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-[color:var(--color-primary)]"
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
