export type MembershipStatus = 'active' | 'payment_pending' | 'paused' | 'cancelled' | 'expired';

export interface Membership {
  id: string;
  user_id: string;
  plan: string;
  status: MembershipStatus;
  credit_balance_minor: number;
  activated_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  paused_at: string | null;
  paused_until: string | null;
  created_at: string;
  profiles?: { id: string; full_name: string | null; phone: string | null };
}

export interface MembershipListResponse {
  memberships: Membership[];
  total: number;
}
