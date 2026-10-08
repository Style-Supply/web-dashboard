'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listNotificationLogs, testSendWhatsApp } from '@/lib/notifications';
import type { NotificationLog, NotificationChannel, NotificationStatus } from '@/types/notification';

const TEMPLATE_PRESETS: Record<string, { label: string; variables: string[] }> = {
  box_order_confirmed_new: {
    label: 'Box Order Confirmed (box_order_confirmed_new)',
    variables: ['customer_name', 'order_id', 'no_of_items', 'date'],
  },
  atelier_subscription_new: {
    label: 'Atelier Subscription Confirmed (atelier_subscription_new)',
    variables: ['customer_name', 'date'],
  },
  box_delivered_new: {
    label: 'Box Delivered (box_delivered_new)',
    variables: ['customer_name', 'delivery_date_time', 'sessionend_date_time'],
  },
  session_half_reminder_new: {
    label: 'Session 24hr Reminder (session_half_reminder_new)',
    variables: ['customer_name', 'date', 'order_id'],
  },
  decision_summary_new: {
    label: 'Decision Summary (decision_summary_new)',
    variables: ['customer_name', 'order_id', 'kept_count', 'rented_count', 'returned_count', 'amount_paid'],
  },
  pickup_scheduled_new: {
    label: 'Pickup Scheduled (pickup_scheduled_new)',
    variables: ['customer_name', 'order_id', 'count_rented', 'count_returned', 'date'],
  },
  late_fee_started: {
    label: 'Late Fee Started (late_fee_started)',
    variables: ['customer_name', 'order_id', 'end_date', 'total_late_fee_amount'],
  },
  return_received_new: {
    label: 'Return Received (return_received_new)',
    variables: ['customer_name', 'order_id', 'count'],
  },
  session_closed_new: {
    label: 'Session Closed (session_closed_new)',
    variables: ['customer_name', 'order_id'],
  },
  membership_cancelled: {
    label: 'Membership Cancelled (membership_cancelled)',
    variables: ['customer_name', 'date'],
  },
  membership_paused: {
    label: 'Membership Paused (membership_paused)',
    variables: ['customer_name', 'pause_date', 'resume_date'],
  },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function NotificationLogsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  // Test modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState('box_order_confirmed_new');
  const [testPhone, setTestPhone] = useState('919082203857');
  const [testCustomerName, setTestCustomerName] = useState('Valued Member');
  const [testVars, setTestVars] = useState<Record<string, string>>({
    customer_name: 'Valued Member',
    order_id: 'SS-TEST-001',
    no_of_items: '3',
    date: '2-3 business days',
  });
  const [sendingTest, setSendingTest] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNotificationLogs({
        channel: channelFilter === 'all' ? undefined : channelFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 100,
      });
      setLogs(res.logs || []);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to load notification logs');
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTemplateChange = (tpl: string) => {
    setTestTemplate(tpl);
    const def = TEMPLATE_PRESETS[tpl];
    if (def) {
      const initial: Record<string, string> = {};
      def.variables.forEach((v) => {
        if (v === 'customer_name') initial[v] = testCustomerName || 'Valued Member';
        else if (v.includes('order_id')) initial[v] = 'SS-TEST-999';
        else if (v.includes('count') || v.includes('no_of_items')) initial[v] = '2';
        else if (v.includes('amount')) initial[v] = '₹500';
        else if (v.includes('date')) initial[v] = 'Tomorrow, 2:00 PM';
        else initial[v] = 'Sample Value';
      });
      setTestVars(initial);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      showToast('error', 'Phone number is required');
      return;
    }
    setSendingTest(true);
    try {
      const res = await testSendWhatsApp({
        phone: testPhone.trim(),
        template_name: testTemplate,
        variables: testVars,
        customer_name: testCustomerName,
      });

      if (res.success) {
        showToast('success', `Test notification queued/sent successfully via ${testTemplate}`);
        setTestModalOpen(false);
        void load();
      } else {
        showToast('error', res.error || 'Failed to send test notification');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Test send request failed');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F4] px-6 py-8 md:px-10">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#2C0505]">Notification Logs</h1>
          <p className="mt-1 text-sm text-[#7A5B5B]">
            Real-time audit log of all transactional Email (Resend/Mailchimp) and WhatsApp (MSG91) deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#2C0505]/15 bg-white px-3.5 py-2 text-sm font-medium text-[#2C0505] shadow-sm hover:bg-[#FDF8F4] transition-colors"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
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
            Refresh
          </button>

          <button
            onClick={() => setTestModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#5C0116] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Send Test WhatsApp
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-[#2C0505]/10 bg-white p-4 shadow-sm md:grid-cols-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A5B5B]">
            Search Recipient / Template / Event
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, phone, template..."
            className="mt-1 w-full rounded-lg border border-[#2C0505]/15 px-3 py-2 text-sm text-[#2C0505] placeholder-[#9A8080] focus:border-[#7A021D] focus:outline-none"
          />
        </div>

        {/* Channel Filter */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A5B5B]">Channel</label>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#2C0505]/15 bg-white px-3 py-2 text-sm text-[#2C0505] focus:border-[#7A021D] focus:outline-none"
          >
            <option value="all">All Channels (Email + WhatsApp)</option>
            <option value="whatsapp">WhatsApp Only</option>
            <option value="email">Email Only</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A5B5B]">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#2C0505]/15 bg-white px-3 py-2 text-sm text-[#2C0505] focus:border-[#7A021D] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success / Sent</option>
            <option value="failed">Failed / Rejected</option>
            <option value="skipped">Skipped (No recipient)</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Stats summary */}
        <div className="flex items-center justify-between rounded-lg bg-[#FDF8F4] px-4 py-2 border border-[#2C0505]/5">
          <div>
            <div className="text-xs text-[#7A5B5B]">Total Displayed</div>
            <div className="text-lg font-bold text-[#2C0505]">{logs.length}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#7A5B5B]">Failed</div>
            <div className="text-lg font-bold text-red-600">
              {logs.filter((l) => l.status === 'failed').length}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#2C0505]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#2C0505]">
            <thead className="border-b border-[#2C0505]/10 bg-[#FBF5F0] text-xs font-semibold uppercase tracking-wider text-[#7A5B5B]">
              <tr>
                <th className="px-4 py-3.5">Time</th>
                <th className="px-4 py-3.5">Channel</th>
                <th className="px-4 py-3.5">Event / Trigger</th>
                <th className="px-4 py-3.5">Template</th>
                <th className="px-4 py-3.5">Recipient</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Provider / HTTP</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C0505]/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#7A5B5B]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" />
                      Loading notification logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#7A5B5B]">
                    No notification logs found matching the criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isWa = log.channel === 'whatsapp';
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="cursor-pointer transition-colors hover:bg-[#FDF8F4]/80"
                    >
                      {/* Time */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#7A5B5B]">
                        {formatDate(log.created_at)}
                      </td>

                      {/* Channel Badge */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {isWa ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            WhatsApp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 border border-blue-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Email
                          </span>
                        )}
                      </td>

                      {/* Event / Trigger */}
                      <td className="px-4 py-3 font-medium text-[#2C0505]">
                        {log.event_name}
                      </td>

                      {/* Template */}
                      <td className="px-4 py-3 font-mono text-xs text-[#7A021D]">
                        {log.template_name}
                      </td>

                      {/* Recipient */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-[#2C0505]">{log.recipient}</div>
                        {log.user?.full_name && (
                          <div className="text-xs text-[#7A5B5B]">{log.user.full_name}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Success
                          </span>
                        ) : log.status === 'failed' ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20" title={log.error_message || ''}>
                            Failed
                          </span>
                        ) : log.status === 'skipped' ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Skipped
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                            {log.status}
                          </span>
                        )}
                      </td>

                      {/* Provider / HTTP status */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#7A5B5B]">
                        <span className="uppercase font-semibold text-[#2C0505]">{log.provider}</span>
                        {log.status_code && (
                          <span className="ml-1 text-[11px] text-[#9A8080]">({log.status_code})</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="text-xs font-medium text-[#7A021D] hover:underline"
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Slide-Over / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#2C0505]/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                      selectedLog.channel === 'whatsapp'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedLog.channel}
                  </span>
                  <h2 className="text-lg font-bold text-[#2C0505]">{selectedLog.event_name}</h2>
                </div>
                <p className="mt-1 text-xs text-[#7A5B5B]">
                  ID: <span className="font-mono">{selectedLog.id}</span> &middot; {formatDate(selectedLog.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-[#7A5B5B] hover:bg-[#FDF8F4] hover:text-[#2C0505]"
              >
                ✕
              </button>
            </div>

            {/* Error banner if failed */}
            {selectedLog.error_message && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <div className="font-semibold">Error Message:</div>
                <div className="font-mono text-xs mt-1">{selectedLog.error_message}</div>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-[#FDF8F4] p-3 border border-[#2C0505]/5">
                <div className="text-xs text-[#7A5B5B]">Template Name</div>
                <div className="font-mono font-medium text-[#7A021D]">{selectedLog.template_name}</div>
              </div>
              <div className="rounded-lg bg-[#FDF8F4] p-3 border border-[#2C0505]/5">
                <div className="text-xs text-[#7A5B5B]">Recipient</div>
                <div className="font-mono font-medium text-[#2C0505]">{selectedLog.recipient}</div>
              </div>
              <div className="rounded-lg bg-[#FDF8F4] p-3 border border-[#2C0505]/5">
                <div className="text-xs text-[#7A5B5B]">Provider</div>
                <div className="font-medium text-[#2C0505] uppercase">
                  {selectedLog.provider} (HTTP {selectedLog.status_code || 'N/A'})
                </div>
              </div>
              <div className="rounded-lg bg-[#FDF8F4] p-3 border border-[#2C0505]/5">
                <div className="text-xs text-[#7A5B5B]">Provider Message ID</div>
                <div className="font-mono text-xs text-[#2C0505] truncate">
                  {selectedLog.provider_id || 'None'}
                </div>
              </div>
            </div>

            {/* Request Payload */}
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#7A5B5B] mb-1">
                Sanitized Request Payload
              </div>
              <pre className="max-h-48 overflow-y-auto rounded-lg bg-[#2C0505] p-3 font-mono text-xs text-amber-200">
                {JSON.stringify(selectedLog.request_payload || {}, null, 2)}
              </pre>
            </div>

            {/* Response Data */}
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#7A5B5B] mb-1">
                Provider Response Data
              </div>
              <pre className="max-h-48 overflow-y-auto rounded-lg bg-[#1C1014] p-3 font-mono text-xs text-emerald-300">
                {JSON.stringify(selectedLog.response_data || {}, null, 2)}
              </pre>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-[#7A021D] px-4 py-2 text-sm font-medium text-white hover:bg-[#5C0116]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test WhatsApp Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#2C0505]/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#2C0505]">Send Test WhatsApp Notification</h2>
                <p className="mt-1 text-xs text-[#7A5B5B]">
                  Test any approved MSG91 template directly to your phone.
                </p>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="rounded-lg p-1.5 text-[#7A5B5B] hover:bg-[#FDF8F4]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTest} className="mt-4 space-y-4">
              {/* Phone number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A5B5B]">
                  Recipient Phone (with country code)
                </label>
                <input
                  type="text"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="919082203857"
                  className="mt-1 w-full rounded-lg border border-[#2C0505]/15 px-3 py-2 text-sm font-mono text-[#2C0505] focus:border-[#7A021D] focus:outline-none"
                />
              </div>

              {/* Template selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A5B5B]">
                  Select Template
                </label>
                <select
                  value={testTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2C0505]/15 bg-white px-3 py-2 text-sm text-[#2C0505] focus:border-[#7A021D] focus:outline-none"
                >
                  {Object.entries(TEMPLATE_PRESETS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variables */}
              <div className="rounded-xl border border-[#2C0505]/10 bg-[#FDF8F4] p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#7A5B5B] mb-2">
                  Template Variables (MSG91 Named Parameters)
                </div>
                <div className="space-y-2">
                  {TEMPLATE_PRESETS[testTemplate]?.variables.map((varName) => (
                    <div key={varName}>
                      <label className="block text-xs font-mono text-[#7A021D]">{varName}</label>
                      <input
                        type="text"
                        value={testVars[varName] || ''}
                        onChange={(e) =>
                          setTestVars((prev) => ({ ...prev, [varName]: e.target.value }))
                        }
                        className="mt-0.5 w-full rounded border border-[#2C0505]/15 bg-white px-2 py-1 text-xs text-[#2C0505] focus:border-[#7A021D] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="rounded-lg border border-[#2C0505]/15 px-4 py-2 text-sm font-medium text-[#2C0505] hover:bg-[#FDF8F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="rounded-lg bg-[#7A021D] px-4 py-2 text-sm font-medium text-white hover:bg-[#5C0116] disabled:opacity-50"
                >
                  {sendingTest ? 'Sending...' : 'Send Test Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
