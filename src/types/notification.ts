export type NotificationChannel = 'email' | 'whatsapp';
export type NotificationStatus = 'success' | 'failed' | 'pending' | 'skipped';
export type NotificationProvider = 'msg91' | 'resend' | 'mailchimp' | 'other';

export interface NotificationLog {
  id: string;
  channel: NotificationChannel;
  event_name: string;
  template_name: string;
  recipient: string;
  user_id?: string | null;
  status: NotificationStatus;
  provider: NotificationProvider;
  provider_id?: string | null;
  status_code?: number | null;
  error_message?: string | null;
  request_payload?: Record<string, any> | null;
  response_data?: Record<string, any> | null;
  retry_count: number;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    phone_number?: string;
  } | null;
}

export interface NotificationLogsResponse {
  logs: NotificationLog[];
  total: number;
}
