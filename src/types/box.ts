export type BoxStatus =
  | 'building'
  | 'confirmed'
  | 'packing'
  | 'out_for_delivery'
  | 'delivered'
  | 'boutique_session_active'
  | 'decision_pending'
  | 'purchase_pending'
  | 'returns_review'
  | 'completed'
  | 'cancelled';

export type QcStatus = 'pending' | 'passed' | 'failed';

export interface Box {
  id: string;
  user_id: string;
  status: BoxStatus;
  max_items: number;
  created_at: string;
  confirmed_at: string | null;
  packed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  session_starts_at: string | null;
  session_ends_at: string | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  tracking_number: string | null;
  shipping_address_id: string | null;
  pickup_status: string | null;
  profiles?: { id: string; full_name: string | null; phone: string | null };
  // Included in detail view
  user?: { id: string; full_name: string | null; phone: string | null; email: string | null } | null;
  delivery_address?: {
    id: string; full_name: string; line1: string; line2: string | null;
    city: string; state: string; zip: string; phone: string | null;
  } | null;
}

export interface BoxItem {
  id: string;
  box_id: string;
  product_id: string;
  variant_id: string;
  decision: 'pending' | 'keep' | 'return';
  decision_at: string | null;
  purchase_price_minor: number | null;
  credit_applied_minor: number | null;
  return_reason: string | null;
  qc_status: QcStatus;
  purchase_payment_id: string | null;
  added_at: string;
  product?: {
    id: string; name: string; brand: string | null;
    retail_price_minor: number; thumbnail_url: string | null;
  };
  variant?: { id: string; size: string; colour: string | null };
}

export interface BoxWithItems extends Box {
  items: BoxItem[];
}

export interface BoxListResponse {
  boxes: Box[];
  total: number;
}
