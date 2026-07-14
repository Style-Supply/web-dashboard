'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { listProducts } from '@/lib/api';
import { listBoxes } from '@/lib/boxes';
import { listMemberships } from '@/lib/memberships';
import { listUsers } from '@/lib/users';
import { request } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  products: { total: number; published: number; draft: number; outOfStock: number };
  users: { total: number; pending: number; approved: number; rejected: number; waitlisted: number };
  boxes: { total: number; byStatus: Record<string, number> };
  memberships: { total: number; active: number; paused: number; cancelled: number; creditPool: number };
  payments: { pending: number; awaitingVerification: number; totalConfirmedMinor: number };
}

interface RecentActivity {
  id: string;
  type: 'user' | 'box' | 'payment' | 'membership';
  label: string;
  sub: string;
  time: string;
  color: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, href, icon,
}: {
  label: string; value: string | number; sub?: string; color: string; href: string; icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="block group">
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <svg className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="mt-4">
          <p className="text-[28px] font-semibold text-neutral-900 leading-none">{value}</p>
          <p className="mt-1.5 text-sm font-medium text-neutral-500">{label}</p>
          {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
        </div>
      </div>
    </Link>
  );
}

function MiniBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        <span className="text-xs font-semibold text-neutral-700">{fmt(value)}</span>
      </div>
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AlertBadge({ count, label, href, urgent }: { count: number; label: string; href: string; urgent?: boolean }) {
  if (count === 0) return null;
  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm ${
        urgent ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
      }`}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${urgent ? 'bg-red-500' : 'bg-amber-500'}`} />
        <span className={`text-sm font-semibold ${urgent ? 'text-red-700' : 'text-amber-700'}`}>
          {count} {label}
        </span>
        <svg className="w-4 h-4 ml-auto text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, usersRes, boxesRes, membershipsRes, paymentsRes] = await Promise.all([
        listProducts({ limit: 1 }),
        listUsers({ limit: 1, status: 'all' }),
        listBoxes({ limit: 100 }),
        listMemberships({ limit: 100 }),
        request<{ payments: Array<{ status: string; payable_minor: number; created_at: string }> }>('/api/admin/payments?limit=100'),
      ]);

      // Products breakdown — fetch published and draft separately using total counts
      const [publishedRes, draftRes] = await Promise.all([
        listProducts({ limit: 1, status: 'published' }),
        listProducts({ limit: 1, status: 'draft' }),
      ]);
      const published = publishedRes.total ?? 0;
      const draft = draftRes.total ?? 0;
      const outOfStock = 0; // Requires variant query — shown as 0 until dedicated endpoint added

      // Users breakdown
      const [pendingRes, approvedRes, rejectedRes, waitlistedRes] = await Promise.all([
        listUsers({ limit: 1, status: 'pending' }),
        listUsers({ limit: 1, status: 'approved' }),
        listUsers({ limit: 1, status: 'rejected' }),
        listUsers({ limit: 1, status: 'waitlisted' as 'pending' }),
      ]);

      // Box status breakdown
      const byStatus: Record<string, number> = {};
      for (const box of boxesRes.boxes) {
        byStatus[box.status] = (byStatus[box.status] ?? 0) + 1;
      }

      // Memberships
      const activeMems = membershipsRes.memberships.filter((m: { status: string }) => m.status === 'active').length;
      const pausedMems = membershipsRes.memberships.filter((m: { status: string }) => m.status === 'paused').length;
      const cancelledMems = membershipsRes.memberships.filter((m: { status: string }) => m.status === 'cancelled').length;
      const creditPool = membershipsRes.memberships
        .filter((m: { status: string }) => m.status === 'active')
        .reduce((sum: number, m: { credit_balance_minor: number }) => sum + (m.credit_balance_minor ?? 0), 0);

      // Payments
      const pays = paymentsRes.payments ?? [];
      const pendingPay = pays.filter(p => p.status === 'pending_user_confirmation').length;
      const awaitingVerif = pays.filter(p => p.status === 'pending_admin_verification').length;
      const totalConfirmed = pays
        .filter(p => p.status === 'confirmed')
        .reduce((s, p) => s + p.payable_minor, 0);

      setStats({
        products: { total: productsRes.total, published, draft, outOfStock },
        users: {
          total: usersRes.total,
          pending: pendingRes.total,
          approved: approvedRes.total,
          rejected: rejectedRes.total,
          waitlisted: waitlistedRes.total,
        },
        boxes: { total: boxesRes.total, byStatus },
        memberships: { total: membershipsRes.total, active: activeMems, paused: pausedMems, cancelled: cancelledMems, creditPool },
        payments: { pending: pendingPay, awaitingVerification: awaitingVerif, totalConfirmedMinor: totalConfirmed },
      });

      // Build recent activity from boxes + payments
      const acts: RecentActivity[] = [];
      for (const box of boxesRes.boxes.slice(0, 5)) {
        acts.push({
          id: box.id,
          type: 'box',
          label: `Box #${box.id.slice(0, 8)}`,
          sub: box.status.replace(/_/g, ' '),
          time: box.created_at,
          color: 'bg-indigo-100 text-indigo-600',
        });
      }
      for (const pay of pays.slice(0, 3)) {
        acts.push({
          id: pay.status,
          type: 'payment',
          label: `Payment`,
          sub: pay.status.replace(/_/g, ' '),
          time: pay.created_at,
          color: 'bg-green-100 text-green-600',
        });
      }
      acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(acts.slice(0, 8));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-100 rounded-lg w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-neutral-100 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-600 font-medium">{error ?? 'No data'}</p>
        <button onClick={() => void load()} className="mt-4 px-4 py-2 bg-[#7A021D] text-white rounded-lg text-sm">Retry</button>
      </div>
    );
  }

  const boxStatusOrder = ['building', 'confirmed', 'packing', 'out_for_delivery', 'delivered', 'boutique_session_active', 'decision_pending', 'completed', 'cancelled'];
  const boxStatusColors: Record<string, string> = {
    building: 'bg-neutral-400',
    confirmed: 'bg-blue-500',
    packing: 'bg-indigo-500',
    out_for_delivery: 'bg-violet-500',
    delivered: 'bg-amber-500',
    boutique_session_active: 'bg-orange-500',
    decision_pending: 'bg-rose-400',
    completed: 'bg-emerald-500',
    cancelled: 'bg-neutral-300',
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
          <p className="mt-0.5 text-sm text-neutral-500">StyleSupply operations at a glance</p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Action Alerts */}
      {(stats.payments.awaitingVerification > 0 || stats.payments.pending > 0 || stats.users.pending > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Needs Attention</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AlertBadge count={stats.payments.awaitingVerification} label="payments need verification" href="/payments" urgent />
            <AlertBadge count={stats.payments.pending} label="payments awaiting user" href="/payments" />
            <AlertBadge count={stats.users.pending} label="access requests pending" href="/users" />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Key Metrics</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Products"
            value={fmt(stats.products.total)}
            sub={`${fmt(stats.products.published)} published · ${fmt(stats.products.draft)} draft`}
            color="bg-violet-100 text-violet-600"
            href="/products"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          />
          <StatCard
            label="Members"
            value={fmt(stats.memberships.active)}
            sub={`of ${fmt(stats.memberships.total)} total · ${fmt(stats.memberships.paused)} paused`}
            color="bg-emerald-100 text-emerald-600"
            href="/memberships"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" /></svg>}
          />
          <StatCard
            label="Active Boxes"
            value={fmt(stats.boxes.total)}
            sub={`${fmt((stats.boxes.byStatus['building'] ?? 0) + (stats.boxes.byStatus['confirmed'] ?? 0))} in progress`}
            color="bg-blue-100 text-blue-600"
            href="/boxes"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>}
          />
          <StatCard
            label="Revenue Confirmed"
            value={rupees(stats.payments.totalConfirmedMinor)}
            sub={`${fmt(stats.payments.awaitingVerification)} pending verification`}
            color="bg-amber-100 text-amber-600"
            href="/payments"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
        </div>
      </div>

      {/* Detail Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Users Breakdown */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-neutral-700">Access Requests</h2>
            <Link href="/users" className="text-xs font-medium text-[#7A021D] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3.5">
            <MiniBar label="Pending Review" value={stats.users.pending} total={stats.users.total} color="bg-amber-400" />
            <MiniBar label="Approved" value={stats.users.approved} total={stats.users.total} color="bg-emerald-500" />
            <MiniBar label="Waitlisted" value={stats.users.waitlisted} total={stats.users.total} color="bg-blue-400" />
            <MiniBar label="Rejected" value={stats.users.rejected} total={stats.users.total} color="bg-neutral-300" />
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-50">
            <p className="text-2xl font-semibold text-neutral-900">{fmt(stats.users.total)}</p>
            <p className="text-xs text-neutral-400 mt-0.5">total submissions</p>
          </div>
        </div>

        {/* Box Pipeline */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-neutral-700">Box Pipeline</h2>
            <Link href="/boxes" className="text-xs font-medium text-[#7A021D] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3.5">
            {boxStatusOrder
              .filter(s => (stats.boxes.byStatus[s] ?? 0) > 0)
              .map(s => (
                <MiniBar
                  key={s}
                  label={s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  value={stats.boxes.byStatus[s] ?? 0}
                  total={stats.boxes.total}
                  color={boxStatusColors[s] ?? 'bg-neutral-400'}
                />
              ))}
            {Object.keys(stats.boxes.byStatus).length === 0 && (
              <p className="text-sm text-neutral-400 py-4 text-center">No boxes yet</p>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-50">
            <p className="text-2xl font-semibold text-neutral-900">{fmt(stats.boxes.total)}</p>
            <p className="text-xs text-neutral-400 mt-0.5">total boxes</p>
          </div>
        </div>

        {/* Memberships + Credits */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-neutral-700">Memberships</h2>
            <Link href="/memberships" className="text-xs font-medium text-[#7A021D] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3.5">
            <MiniBar label="Active" value={stats.memberships.active} total={stats.memberships.total} color="bg-emerald-500" />
            <MiniBar label="Paused" value={stats.memberships.paused} total={stats.memberships.total} color="bg-amber-400" />
            <MiniBar label="Cancelled" value={stats.memberships.cancelled} total={stats.memberships.total} color="bg-neutral-300" />
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-50 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-neutral-900">{fmt(stats.memberships.total)}</p>
              <p className="text-xs text-neutral-400 mt-0.5">total memberships</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-emerald-600">{rupees(stats.memberships.creditPool)}</p>
              <p className="text-xs text-neutral-400 mt-0.5">credits outstanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products + Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Products Health */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-neutral-700">Catalogue Health</h2>
            <Link href="/products" className="text-xs font-medium text-[#7A021D] hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Published', value: stats.products.published, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Draft', value: stats.products.draft, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Out of Stock', value: stats.products.outOfStock, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-4 ${item.bg}`}>
                <p className={`text-2xl font-semibold ${item.color}`}>{fmt(item.value)}</p>
                <p className="text-xs font-medium text-neutral-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          {stats.products.outOfStock > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {stats.products.outOfStock} item{stats.products.outOfStock > 1 ? 's are' : ' is'} out of stock — restock before dispatching boxes
            </div>
          )}
        </div>

        {/* What To Do Next */}
        <div className="bg-gradient-to-br from-[#2C0505] to-[#7A021D] rounded-2xl p-5 text-white">
          <h2 className="text-sm font-semibold text-white/70 mb-4">What To Do Next</h2>
          <div className="space-y-3">
            {[
              stats.payments.awaitingVerification > 0 && {
                label: `Verify ${stats.payments.awaitingVerification} payment transfer${stats.payments.awaitingVerification > 1 ? 's' : ''}`,
                href: '/payments', urgency: 'high',
              },
              stats.users.pending > 0 && {
                label: `Review ${stats.users.pending} access request${stats.users.pending > 1 ? 's' : ''}`,
                href: '/users', urgency: 'high',
              },
              stats.products.outOfStock > 0 && {
                label: `Restock ${stats.products.outOfStock} out-of-stock variant${stats.products.outOfStock > 1 ? 's' : ''}`,
                href: '/products', urgency: 'medium',
              },
              stats.memberships.active > 0 && {
                label: `${stats.memberships.active} active member${stats.memberships.active > 1 ? 's' : ''} ready for a box`,
                href: '/boxes', urgency: 'low',
              },
              stats.products.draft > 0 && {
                label: `Publish ${stats.products.draft} draft product${stats.products.draft > 1 ? 's' : ''}`,
                href: '/products', urgency: 'low',
              },
            ].filter(Boolean).slice(0, 5).map((item, i) => item && (
              <Link key={i} href={item.href}>
                <div className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2.5 rounded-xl">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    item.urgency === 'high' ? 'bg-red-400 animate-pulse' :
                    item.urgency === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className="text-sm font-medium text-white/90">{item.label}</span>
                  <svg className="w-4 h-4 text-white/50 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
            {stats.payments.awaitingVerification === 0 && stats.users.pending === 0 && stats.products.outOfStock === 0 && (
              <p className="text-sm text-white/60 py-2">✓ Everything looks good!</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
