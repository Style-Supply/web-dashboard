export type BoxStatus =
  | 'building'
  | 'full'
  | 'pending_membership_payment'
  | 'pending_payment_verification'
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
  packing_at: string | null;
  out_for_delivery_at: string | null;
  received_at: string | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  session_ends_at: string | null;
  decisions_locked_at: string | null;
  pickup_status: string | null;
  tracking_number: string | null;
  profiles?: { id: string; full_name: string | null; phone: string | null };
}

export interface BoxItemDetail {
  id: string;
  box_id: string;
  product_id: string;
  variant_id: string;
  decision: 'pending' | 'keep' | 'return';
  return_reason: string | null;
  qc_status: 'pending' | 'passed' | 'failed' | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    retail_price_minor: number;
    thumbnail_url: string | null;
  };
  variant: { id: string; size: string; colour: string | null };
}

export interface BoxDetail extends Box {
  items: BoxItemDetail[];
  user: { id: string; full_name: string | null; phone: string | null } | null;
  address: Record<string, unknown> | null;
}

export interface BoxListResponse {
  boxes: Box[];
  total: number;
}
