'use client';

import { useState, useEffect, useCallback } from 'react';
import { request } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OverviewData {
  period: { from: string; to: string };
  members: { active_members: number; boxes_in_period: number; garments_moved: number };
  trial: { items_sent: number; purchases: number; returned: number; pending: number; purchase_conversion: number };
  rental: { rentals_in_period: number; rental_revenue: number; late_returns: number; late_fees: number };
  money: { sale_revenue: number; total_member_charges: number; brand_payouts_owed: number; damage_charges: number };
  brand_league: Array<{
    name: string;
    items_sent: number;
    purchases: number;
    returns: number;
    rentals: number;
    keep_rate: number | null;
    payout: number;
  }>;
  oos_products: Array<{
    id: string;
    name: string;
    brand: string | null;
    thumbnail_url: string | null;
  }>;
  low_stock_products: Array<{
    id: string;
    name: string;
    brand: string | null;
    total_stock: number;
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtFull(n: number) {
  return `₹ ${n.toLocaleString('en-IN')}`;
}

function pct(n: number | null) {
  if (n === null) return '—';
  return `${n.toFixed(1)}%`;
}

// ─── Quick-select presets ─────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
}

const PRESETS = [
  { label: '7D',  from: daysAgo(7),   to: TODAY },
  { label: '30D', from: daysAgo(30),  to: TODAY },
  { label: '60D', from: daysAgo(60),  to: TODAY },
  { label: 'YTD', from: `${new Date().getFullYear()}-01-01`, to: TODAY },
];

// ─── Mini bar ────────────────────────────────────────────────────────────────

function MiniBar({ value, max, color = '#7A021D' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mt-2 h-1 w-full rounded-full bg-neutral-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  barValue?: number;
  barMax?: number;
  barColor?: string;
  badge?: { text: string; color: string };
}

function KpiCard({ icon, label, value, sub, accent, barValue, barMax, barColor, badge }: KpiProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-5 flex flex-col gap-0.5 shadow-sm transition-shadow hover:shadow-md ${accent ? 'border-[#7A021D]/25' : 'border-neutral-200'}`}>
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#7A021D]/4 to-transparent pointer-events-none" />
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl">{icon}</span>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>{badge.text}</span>
        )}
      </div>
      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-extrabold leading-tight mt-0.5 ${accent ? 'text-[#7A021D]' : 'text-[#2C0505]'}`}>{value}</span>
      {sub && <span className="text-[11px] text-neutral-400 mt-0.5">{sub}</span>}
      {barValue !== undefined && barMax !== undefined && (
        <MiniBar value={barValue} max={barMax} color={barColor} />
      )}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, dot }: { icon: string; title: string; subtitle?: string; dot: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${dot} text-white text-sm shadow-sm`}>{icon}</div>
      <div>
        <h2 className="text-sm font-bold text-[#2C0505] uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-[11px] text-neutral-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OverviewPage(): React.ReactElement {
  const [from, setFrom] = useState('2026-06-01');
  const [to,   setTo]   = useState(TODAY);
  const [activePreset, setActivePreset] = useState<string | null>('30D');
  const [data,    setData]    = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchOverview = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await request<OverviewData>(`/api/admin/overview?from=${f}&to=${t}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchOverview(from, to); }, []);

  function applyPreset(p: typeof PRESETS[0]) {
    setActivePreset(p.label);
    setFrom(p.from);
    setTo(p.to);
    void fetchOverview(p.from, p.to);
  }

  function handleApply() {
    setActivePreset(null);
    void fetchOverview(from, to);
  }

  const d = data;
  const maxBrandItems = d ? Math.max(...d.brand_league.map((b) => b.items_sent), 1) : 1;
  const totalRevenue  = d ? d.money.sale_revenue + d.rental.rental_revenue : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2C0505] tracking-tight">Overview</h1>
            <p className="text-sm text-neutral-500 mt-1">Members · Trial · Rental · Revenue — all in one view</p>
          </div>

          {/* Date controls */}
          <div className="flex flex-col items-end gap-2">
            {/* Quick presets */}
            <div className="flex items-center gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activePreset === p.label
                      ? 'bg-[#7A021D] text-white shadow-md'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#7A021D] hover:text-[#7A021D]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom range */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs shadow-sm">
                <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setActivePreset(null); }}
                  className="border-none outline-none text-[#2C0505] text-xs bg-transparent w-28" />
                <span className="text-neutral-300">→</span>
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setActivePreset(null); }}
                  className="border-none outline-none text-[#2C0505] text-xs bg-transparent w-28" />
              </div>
              <button
                onClick={handleApply}
                disabled={loading}
                className="rounded-xl bg-[#7A021D] px-4 py-2 text-xs font-bold text-white hover:bg-[#5a0115] disabled:opacity-50 shadow-sm transition-colors"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : 'Apply'}
              </button>
            </div>
          </div>
        </div>

        {/* Period pill */}
        {d && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            {d.period.from} → {d.period.to}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !d && (
        <div className="space-y-6">
          {[3, 5, 4, 4].map((cols, i) => (
            <div key={i} className={`grid grid-cols-${cols} gap-4`}>
              {Array.from({ length: cols }).map((_, j) => (
                <div key={j} className="h-28 rounded-2xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Dashboard Content ───────────────────────────────────────────────── */}
      {d && (
        <div className="space-y-8">

          {/* ── HERO ROW: Total Revenue ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2C0505] to-[#7A021D] p-6 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none" />
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Total Revenue (Period)</p>
              <p className="text-5xl font-extrabold tracking-tight mb-4">{fmtFull(totalRevenue)}</p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[11px] text-white/50 uppercase tracking-wide">Sale Revenue</p>
                  <p className="text-lg font-bold text-white">{fmt(d.money.sale_revenue)}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="text-[11px] text-white/50 uppercase tracking-wide">Rental Revenue</p>
                  <p className="text-lg font-bold text-white">{fmt(d.rental.rental_revenue)}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="text-[11px] text-white/50 uppercase tracking-wide">Member Charges</p>
                  <p className="text-lg font-bold text-white">{fmt(d.money.total_member_charges)}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-rows-2 gap-4">
              <KpiCard icon="💎" label="Active Members" value={d.members.active_members} accent
                badge={{ text: 'Live', color: 'bg-emerald-50 text-emerald-600' }} />
              <KpiCard icon="📦" label="Boxes Dispatched" value={d.members.boxes_in_period}
                sub={`${d.members.garments_moved} garments moved`} />
            </div>
          </div>

          {/* ── TRIAL ──────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader icon="👗" title="Trial" subtitle="Items sent, kept, returned" dot="bg-amber-500" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <KpiCard icon="📤" label="Items Sent" value={d.trial.items_sent}
                barValue={d.trial.items_sent} barMax={d.trial.items_sent} barColor="#f59e0b" />
              <KpiCard icon="✅" label="Keeps" value={d.trial.purchases}
                sub="decision = keep"
                barValue={d.trial.purchases} barMax={d.trial.items_sent} barColor="#10b981" />
              <KpiCard icon="↩️" label="Returns" value={d.trial.returned}
                sub="decision = return"
                barValue={d.trial.returned} barMax={d.trial.items_sent} barColor="#6366f1" />
              <KpiCard icon="⏳" label="Pending" value={d.trial.pending}
                sub="awaiting decision"
                barValue={d.trial.pending} barMax={d.trial.items_sent} barColor="#94a3b8" />
              <KpiCard icon="🎯" label="Conversion" value={pct(d.trial.purchase_conversion)} accent
                sub="keeps ÷ sent"
                badge={d.trial.purchase_conversion >= 50
                  ? { text: 'Great', color: 'bg-emerald-50 text-emerald-600' }
                  : d.trial.purchase_conversion > 0
                  ? { text: 'Low', color: 'bg-amber-50 text-amber-600' }
                  : undefined}
                barValue={d.trial.purchase_conversion} barMax={100} barColor="#7A021D" />
            </div>
          </div>

          {/* ── RENTAL ─────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader icon="🔄" title="Rental" subtitle="Rentals, revenue & late fees" dot="bg-blue-500" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="🔁" label="Rentals" value={d.rental.rentals_in_period}
                barValue={d.rental.rentals_in_period} barMax={d.rental.rentals_in_period} barColor="#3b82f6" />
              <KpiCard icon="💰" label="Rental Revenue" value={fmt(d.rental.rental_revenue)}
                sub={fmtFull(d.rental.rental_revenue)} accent />
              <KpiCard icon="⚠️" label="Late Returns" value={d.rental.late_returns}
                badge={d.rental.late_returns > 0 ? { text: 'Attention', color: 'bg-red-50 text-red-500' } : { text: 'Clear', color: 'bg-emerald-50 text-emerald-600' }} />
              <KpiCard icon="🔖" label="Late Fees" value={fmt(d.rental.late_fees)}
                sub={fmtFull(d.rental.late_fees)} />
            </div>
          </div>

          {/* ── MONEY ──────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader icon="💳" title="Money" subtitle="Revenue breakdown & payables" dot="bg-emerald-500" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="🛍️" label="Sale Revenue" value={fmt(d.money.sale_revenue)} accent
                sub={fmtFull(d.money.sale_revenue)} />
              <KpiCard icon="👤" label="Member Charges" value={fmt(d.money.total_member_charges)}
                sub={fmtFull(d.money.total_member_charges)} />
              <KpiCard icon="🏷️" label="Brand Payouts Owed" value={fmt(d.money.brand_payouts_owed)}
                sub={fmtFull(d.money.brand_payouts_owed)}
                badge={d.money.brand_payouts_owed > 0 ? { text: 'Pending', color: 'bg-amber-50 text-amber-600' } : undefined} />
              <KpiCard icon="🔧" label="Damage Charges" value={fmt(d.money.damage_charges)}
                sub={fmtFull(d.money.damage_charges)} />
            </div>
          </div>

          {/* ── STOCK ALERTS ─────────────────────────────────────────────── */}
          {((d.oos_products ?? []).length > 0 || (d.low_stock_products ?? []).length > 0) && (
            <div>
              <SectionHeader icon="📦" title="Stock Alerts" subtitle="Published products needing restocking" dot="bg-red-500" />

              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <KpiCard
                  icon="🔴" label="Out of Stock" value={(d.oos_products ?? []).length}
                  accent={(d.oos_products ?? []).length > 0}
                  sub="published, zero qty"
                  badge={(d.oos_products ?? []).length > 0 ? { text: 'Action Needed', color: 'bg-red-50 text-red-600' } : { text: 'Clear', color: 'bg-emerald-50 text-emerald-600' }}
                />
                <KpiCard
                  icon="🟡" label="Low Stock" value={(d.low_stock_products ?? []).length}
                  sub="≤ 3 units remaining"
                  badge={(d.low_stock_products ?? []).length > 0 ? { text: 'Watch', color: 'bg-amber-50 text-amber-600' } : { text: 'Clear', color: 'bg-emerald-50 text-emerald-600' }}
                />
              </div>

              {/* OOS Product Grid */}
              {(d.oos_products ?? []).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Out of Stock — Published Products
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {(d.oos_products ?? []).map((p) => (
                      <a
                        key={p.id}
                        href={`/products?edit=${p.id}`}
                        className="group relative flex flex-col rounded-xl border border-red-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-red-400 transition-all"
                        title={`Restock ${p.name}`}
                      >
                        {/* Thumbnail */}
                        <div className="relative aspect-square bg-red-50 overflow-hidden">
                          {p.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnail_url} alt={p.name}
                              className="h-full w-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-3xl">👗</div>
                          )}
                          {/* OOS overlay badge */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="rounded-full bg-red-600/90 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm tracking-wide">
                              OUT OF STOCK
                            </span>
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-2">
                          <p className="text-[11px] font-semibold text-[#2C0505] truncate leading-tight">{p.name}</p>
                          {p.brand && <p className="text-[10px] text-neutral-400 truncate">{p.brand}</p>}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Stock List */}
              {(d.low_stock_products ?? []).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                    Low Stock — Restock Soon
                  </h3>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/30 overflow-hidden">
                    {(d.low_stock_products ?? []).map((p, idx) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between px-4 py-3 ${
                          idx < (d.low_stock_products ?? []).length - 1 ? 'border-b border-amber-100' : ''
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#2C0505]">{p.name}</p>
                          {p.brand && <p className="text-[11px] text-neutral-400">{p.brand}</p>}
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {p.total_stock} unit{p.total_stock !== 1 ? 's' : ''} left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BRAND LEAGUE ───────────────────────────────────────────────── */}
          <div>
            <SectionHeader icon="🏆" title="Brand League" subtitle="Period performance by brand" dot="bg-purple-500" />
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider w-8">#</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Brand</th>
                    <th className="text-right px-4 py-3.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Sent</th>
                    <th className="text-right px-4 py-3.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Keeps</th>
                    <th className="text-right px-4 py-3.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Returns</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Keep Rate</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {d.brand_league.map((brand, idx) => {
                    const kr = brand.keep_rate;
                    const krColor = kr === null ? 'text-neutral-300' : kr >= 50 ? 'text-emerald-600' : kr > 0 ? 'text-amber-600' : 'text-neutral-400';
                    const barW = brand.items_sent > 0 ? Math.min((brand.items_sent / maxBrandItems) * 100, 100) : 0;
                    return (
                      <tr key={brand.name} className="hover:bg-[#FDF8F4] transition-colors group">
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                            idx === 1 ? 'bg-neutral-200 text-neutral-600' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-neutral-100 text-neutral-500'
                          }`}>{idx + 1}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C0505]/5 text-xs font-bold text-[#2C0505] shrink-0">
                              {brand.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#2C0505]">{brand.name}</p>
                              <div className="mt-0.5 h-1 w-24 rounded-full bg-neutral-100 overflow-hidden">
                                <div className="h-full rounded-full bg-purple-400 transition-all duration-500" style={{ width: `${barW}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-neutral-700">{brand.items_sent}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            {brand.purchases > 0 && <span className="text-emerald-400">▲</span>}
                            {brand.purchases}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-neutral-600">{brand.returns}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${krColor}`}>{pct(kr)}</span>
                            {kr !== null && (
                              <div className="flex-1 max-w-16 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                                <div className={`h-full rounded-full ${kr >= 50 ? 'bg-emerald-400' : kr > 0 ? 'bg-amber-400' : 'bg-neutral-300'}`}
                                  style={{ width: `${Math.min(kr, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-[#2C0505]">
                          {fmt(brand.payout)}
                          {brand.payout > 0 && (
                            <p className="text-[10px] text-neutral-400 font-normal">{fmtFull(brand.payout)}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {d.brand_league.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <div className="text-3xl mb-2">🏆</div>
                        <p className="text-neutral-400 text-sm">No brand data for this period</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
