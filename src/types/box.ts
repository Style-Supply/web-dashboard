export type BoxStatus = 'building' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'session_active' | 'session_ended';

export interface Box {
  id: string;
  user_id: string;
  status: BoxStatus;
  max_items: number;
  created_at: string;
  confirmed_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  tracking_number: string | null;
  profiles?: { id: string; full_name: string | null; phone: string | null };
}

export interface BoxListResponse {
  boxes: Box[];
  total: number;
}
