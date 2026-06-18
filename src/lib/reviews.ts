import { request } from './api';

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  body: string | null;
  review_type: 'returned' | 'purchased' | null;
  loved_reason: string | null;
  disliked_reason: string | null;
  return_reason: string | null;
  share_publicly: boolean;
  admin_approved_public: boolean;
  created_at: string;
  products?: { id: string; name: string; brand: string | null };
  profiles?: { full_name: string | null };
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
}

export async function listReviews(query: {
  rating?: number;
  review_type?: 'returned' | 'purchased';
  public_only?: boolean;
} = {}): Promise<ReviewListResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return request<ReviewListResponse>(`/api/admin/reviews${qs ? `?${qs}` : ''}`);
}

export async function setReviewPublic(id: string, approved: boolean): Promise<Review> {
  return request<Review>(`/api/admin/reviews/${id}/public`, {
    method: 'POST',
    body: JSON.stringify({ approved }),
  });
}
