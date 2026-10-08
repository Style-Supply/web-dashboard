import { request } from './api';
import type { NotificationLogsResponse } from '@/types/notification';

export interface ListNotificationLogsQuery {
  channel?: string;
  status?: string;
  template?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listNotificationLogs(query: ListNotificationLogsQuery = {}): Promise<NotificationLogsResponse> {
  const params = new URLSearchParams();
  if (query.channel) params.set('channel', query.channel);
  if (query.status) params.set('status', query.status);
  if (query.template) params.set('template', query.template);
  if (query.search) params.set('search', query.search);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.offset) params.set('offset', String(query.offset));

  const qs = params.toString();
  return request<NotificationLogsResponse>(`/api/admin/notifications/logs${qs ? `?${qs}` : ''}`);
}

export async function testSendWhatsApp(payload: {
  phone: string;
  template_name: string;
  variables: Record<string, string>;
  customer_name?: string;
  to?: string;
  template?: string;
  fullName?: string;
  orderNumber?: string;
}): Promise<{ success: boolean; result?: any; error?: string }> {
  const body = {
    to: payload.to || payload.phone,
    phone: payload.phone || payload.to,
    template: payload.template || payload.template_name,
    template_name: payload.template_name || payload.template,
    fullName: payload.fullName || payload.customer_name,
    variables: payload.variables,
    orderNumber: payload.orderNumber || payload.variables?.order_id || 'SS-TEST-001',
  };
  return request<{ success: boolean; result?: any; error?: string }>(`/api/admin/notifications/test-send-whatsapp`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
