'use client';

import React from 'react';
import Button from './Button';

interface DeleteUserConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  targetName?: string;
  count?: number;
}

export default function DeleteUserConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  targetName,
  count,
}: DeleteUserConfirmationModalProps) {
  if (!isOpen) return null;

  const isBulk = typeof count === 'number' && count > 1;
  const displayName = isBulk ? `${count} selected users` : targetName || 'this user';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-start gap-4 bg-red-50/50">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              {isBulk ? `Permanently Delete ${count} Users?` : `Permanently Delete User?`}
            </h3>
            <p className="mt-1 text-xs text-red-600 font-medium uppercase tracking-wider">
              Destructive Action · Cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Are you sure you want to completely delete <strong className="text-neutral-900">{displayName}</strong>?
            All linked records will be permanently erased from the database:
          </p>

          <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-red-500 font-bold shrink-0 mt-0.5 text-sm">📦</span>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Boxes & Rented Items</p>
                <p className="text-xs text-neutral-500">
                  All active, packing, dispatched, and past boxes along with their item records will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-red-500 font-bold shrink-0 mt-0.5 text-sm">💳</span>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Orders, Invoices & Payments</p>
                <p className="text-xs text-neutral-500">
                  Purchased item records, Razorpay transactions, and payment receipts associated with this account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-red-500 font-bold shrink-0 mt-0.5 text-sm">👑</span>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Memberships & Credits</p>
                <p className="text-xs text-neutral-500">
                  Active membership tier, credit ledger history, and wallet balances will be cleared.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-red-500 font-bold shrink-0 mt-0.5 text-sm">👤</span>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Profile & Login Credentials</p>
                <p className="text-xs text-neutral-500">
                  Authentication login credentials, addresses, style preferences, and onboarding submissions will be removed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded h-8 px-4 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              'Yes, Delete User & All Data'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
