'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { getMembershipCreditLedger, type CreditLedgerResponse, type CreditLedgerTransaction } from '@/lib/memberships';
import type { Membership } from '@/types/membership';

interface CreditLedgerDrawerProps {
  membership: Membership;
  onClose: () => void;
}

function formatRupees(minor: number): string {
  const isNegative = minor < 0;
  const abs = Math.abs(minor);
  const formatted = `₹${(abs / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  return isNegative ? `-${formatted}` : `+${formatted}`;
}

function formatAbsoluteRupees(minor: number): string {
  return `₹${(Math.abs(minor) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CreditLedgerDrawer({
  membership,
  onClose,
}: CreditLedgerDrawerProps): React.ReactElement {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<CreditLedgerResponse | null>(null);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMembershipCreditLedger(membership.id);
      setLedger(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load credit ledger');
    } finally {
      setLoading(false);
    }
  }, [membership.id, showToast]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* ── Slide-in Drawer ── */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-50/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📜</span>
              <h2 className="text-lg font-bold text-[#2C0505]">Member Credit Ledger</h2>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {membership.profiles?.full_name ?? 'Member'} &bull; {membership.profiles?.phone || 'No phone'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadLedger()}
              disabled={loading}
              title="Refresh ledger"
              className="rounded-lg border border-neutral-200 bg-white p-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <svg
                className={`h-4 w-4 ${loading ? 'animate-spin text-[#7A021D]' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Balance & Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#7A021D]/20 bg-[#FDF8F4] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A021D]">Available Balance</p>
              <p className="mt-1 text-2xl font-extrabold text-[#7A021D]">
                {formatAbsoluteRupees(ledger?.available_minor ?? membership.credit_balance_minor)}
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">Live active wallet balance</p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Current Plan</p>
              <p className="mt-1 text-lg font-bold text-[#2C0505] capitalize">
                {membership.plan.replace(/_/g, ' ')}
              </p>
              <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {membership.status}
              </span>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Entries</p>
              <p className="mt-1 text-2xl font-extrabold text-[#2C0505]">
                {ledger?.transactions.length ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">Credits & deductions</p>
            </div>
          </div>

          {/* Current Active Box Allocation (if any) */}
          {ledger?.current_box && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📦</span>
                  <p className="text-sm font-bold text-amber-900">
                    Active Box #{ledger.current_box.box_number ?? 1}
                  </p>
                  {ledger.current_box.order_number && (
                    <span className="rounded-md bg-white px-2 py-0.5 text-xs font-mono font-bold text-[#7A021D] border border-amber-200">
                      Order #{ledger.current_box.order_number}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-200/80 text-amber-800 uppercase tracking-wider">
                  Current Box
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-amber-900">
                <span>Credit Reserved on Box:</span>
                <span className="font-bold text-sm">
                  {formatAbsoluteRupees(ledger.current_box.credit_applied_minor)}
                </span>
              </div>
            </div>
          )}

          {/* Other Boxes Summary (if any) */}
          {ledger?.other_boxes && ledger.other_boxes.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Past Box Credit Breakdown
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ledger.other_boxes.map((b: any, idx: number) => (
                  <div key={b.box_id || idx} className="rounded-lg bg-white p-2.5 border border-neutral-200 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-neutral-800">Box #{b.box_number}</p>
                      {b.order_number && (
                        <span className="font-mono text-[11px] text-[#7A021D] font-bold">
                          Order #{b.order_number}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-neutral-700">
                      {formatAbsoluteRupees(b.credit_applied_minor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Ledger Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                Transaction History & Order IDs
              </h3>
              <span className="text-xs text-neutral-400">Chronological ledger</span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
                ))}
              </div>
            ) : !ledger?.transactions || ledger.transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-400">
                No credit transactions recorded yet for this member.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-left">
                    <tr>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Description</th>
                      <th className="px-3.5 py-2.5">Order No.</th>
                      <th className="px-3.5 py-2.5 text-right">Amount</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {ledger.transactions.map((tx: CreditLedgerTransaction) => {
                      const isGrant = tx.type === 'grant';
                      const isDeduction = tx.type === 'deduction';
                      return (
                        <tr key={tx.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="px-3.5 py-3 whitespace-nowrap text-neutral-500 font-medium">
                            {new Date(tx.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-3.5 py-3">
                            <p className="font-semibold text-neutral-800">{tx.description}</p>
                            {tx.box_label && (
                              <p className="text-[10px] text-neutral-400 mt-0.5">{tx.box_label}</p>
                            )}
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            {tx.order_number ? (
                              <span className="inline-flex items-center rounded-md bg-[#FDF8F4] px-2 py-0.5 font-mono text-[11px] font-bold text-[#7A021D] border border-[#7A021D]/20">
                                Order #{tx.order_number}
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className={`px-3.5 py-3 text-right font-bold whitespace-nowrap ${
                            isGrant ? 'text-emerald-700' : isDeduction ? 'text-[#7A021D]' : 'text-neutral-500'
                          }`}>
                            {formatRupees(tx.amount_minor)}
                          </td>
                          <td className="px-3.5 py-3 text-center whitespace-nowrap">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              tx.status === 'confirmed' || tx.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-end border-t border-neutral-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Close
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
