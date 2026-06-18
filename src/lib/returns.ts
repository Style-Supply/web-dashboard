import { request } from './api';

export interface ReturnedItem {
  id: string;
  product_name: string;
  variant_size: string;
  return_reason: string | null;
  qc_status: 'pending' | 'passed' | 'failed' | null;
}

export interface ReturnBox {
  id: string;
  user_id: string;
  status: string;
  pickup_status: 'scheduled' | 'in_transit' | 'picked_up' | null;
  received_at: string | null;
  decisions_locked_at: string | null;
  user: { id: string; full_name: string | null } | null;
  returned_items: ReturnedItem[];
}

export async function listReturns(): Promise<{ returns: ReturnBox[] }> {
  return request<{ returns: ReturnBox[] }>(`/api/admin/returns`);
}

export async function setPickupStatus(
  boxId: string,
  pickupStatus: 'scheduled' | 'in_transit' | 'picked_up',
): Promise<ReturnBox> {
  return request<ReturnBox>(`/api/admin/returns/${boxId}/pickup`, {
    method: 'POST',
    body: JSON.stringify({ pickup_status: pickupStatus }),
  });
}

export async function markReceived(boxId: string): Promise<ReturnBox> {
  return request<ReturnBox>(`/api/admin/returns/${boxId}/receive`, { method: 'POST' });
}

export async function qcItem(
  itemId: string,
  result: 'passed' | 'failed',
  notes?: string,
): Promise<{ item_id: string; qc_status: string; box_status: string }> {
  return request(`/api/admin/returns/items/${itemId}/qc`, {
    method: 'POST',
    body: JSON.stringify({ result, notes }),
  });
}
