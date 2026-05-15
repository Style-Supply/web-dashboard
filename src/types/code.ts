export type AccessCodeType = 'invite' | 'promo' | 'both';

export interface AccessCode {
  id: string;
  code: string;
  type: AccessCodeType;
  grants_access: boolean;
  discount_minor: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}
