'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  type MembershipPlan,
  type MembershipPlanPayload,
} from '@/lib/membership-plans';

interface MembershipPlanDrawerProps {
  initialPlan?: MembershipPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MembershipPlanDrawer({
  initialPlan,
  onClose,
  onSuccess,
}: MembershipPlanDrawerProps): React.ReactElement {
  const { showToast } = useToast();
  const isEditing = Boolean(initialPlan);

  const [name, setName] = useState(initialPlan?.name ?? '');
  const [slug, setSlug] = useState(initialPlan?.slug ?? '');
  const [tagline, setTagline] = useState(initialPlan?.tagline ?? '');
  const [priceRupees, setPriceRupees] = useState(initialPlan ? String(initialPlan.price_minor / 100) : '5000');
  const [creditRupees, setCreditRupees] = useState(initialPlan ? String(initialPlan.default_credit_minor / 100) : '5000');
  const [badge, setBadge] = useState(initialPlan?.badge ?? '');
  const [isPopular, setIsPopular] = useState(initialPlan?.is_popular ?? false);
  const [description, setDescription] = useState(initialPlan?.description ?? '');
  const [featuresText, setFeaturesText] = useState(initialPlan?.features ? initialPlan.features.join('\n') : '');
  const [sortOrder, setSortOrder] = useState(initialPlan?.sort_order ? String(initialPlan.sort_order) : '1');

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Tier name is required');
      return;
    }

    const price = Number(priceRupees);
    const credit = Number(creditRupees);
    if (!Number.isFinite(price) || price < 0) {
      showToast('error', 'Please enter a valid price in ₹');
      return;
    }
    if (!Number.isFinite(credit) || credit < 0) {
      showToast('error', 'Please enter a valid credit amount in ₹');
      return;
    }

    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const payload: MembershipPlanPayload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      tagline: tagline.trim() || undefined,
      price_minor: Math.round(price * 100),
      default_credit_minor: Math.round(credit * 100),
      is_popular: isPopular,
      badge: badge.trim() || undefined,
      features,
      description: description.trim() || undefined,
      sort_order: Number(sortOrder) || 1,
    };

    setSubmitting(true);
    try {
      if (isEditing && initialPlan) {
        await updateMembershipPlan(initialPlan.id, payload);
        showToast('success', 'Membership tier updated');
      } else {
        await createMembershipPlan(payload);
        showToast('success', 'Membership tier created');
      }
      onSuccess();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!initialPlan) return;
    if (!confirm(`Delete membership tier "${initialPlan.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteMembershipPlan(initialPlan.id);
      showToast('success', 'Membership tier deleted');
      onSuccess();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
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
              👑
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isEditing ? 'Edit Membership Tier' : 'Add Membership Tier'}
              </h2>
              <p className="text-xs text-white/60">Configure pricing, badge, and member features</p>
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
        <form id="membership-plan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Tier Name & Badge */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                Tier Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Atelier"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#7A021D]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                Badge Label
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. Best Value / Free Access"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#7A021D]"
              />
            </div>
          </div>

          {/* Slug & Tagline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                Identifier / Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="the_atelier"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#7A021D]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="₹5,000 / month, fully redeemable"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#7A021D]"
              />
            </div>
          </div>

          {/* Pricing & Credit Balance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                Monthly Fee (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  placeholder="5000"
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-8 pr-3 text-sm font-bold outline-none focus:border-[#7A021D]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                Returned Credit (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={creditRupees}
                  onChange={(e) => setCreditRupees(e.target.value)}
                  placeholder="5000"
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-8 pr-3 text-sm font-bold outline-none focus:border-[#7A021D]"
                />
              </div>
            </div>
          </div>

          {/* Popular Highlight Switch */}
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <input
              type="checkbox"
              id="is_popular"
              checked={isPopular}
              onChange={(e) => setIsPopular(e.target.checked)}
              className="h-4 w-4 rounded accent-[#7A021D]"
            />
            <label htmlFor="is_popular" className="text-xs font-bold text-[#2C0505] cursor-pointer">
              Highlight as &quot;Best Value / Featured Tier&quot;
            </label>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              Tier Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of benefits for customers…"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#7A021D]"
            />
          </div>

          {/* Features (One per line) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              Tier Features List (One per line)
            </label>
            <textarea
              rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="Everything in membership&#10;A personal stylist and concierge&#10;Extended rental windows&#10;Member-only pricing"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#7A021D]"
            />
          </div>

          {/* Sort Order */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
              Display Order
            </label>
            <input
              type="number"
              min="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-24 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#7A021D]"
            />
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between border-t border-neutral-200 bg-white px-6 py-4">
          {isEditing ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="rounded-xl border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete Tier'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="membership-plan-form"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-5 py-2 text-xs font-bold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-all shadow-md"
            >
              {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Tier'}
            </button>
          </div>
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
