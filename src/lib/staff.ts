import { request } from '@/lib/api';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface ResourcePermission {
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  created_by: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  permissions?: ResourcePermission[];
}

export type ManagedResource =
  | 'products' | 'orders' | 'payments' | 'boxes' | 'returns'
  | 'reviews' | 'memberships' | 'codes' | 'users'
  | 'brands' | 'collections' | 'locations';

export const ALL_RESOURCES: ManagedResource[] = [
  'products', 'orders', 'payments', 'boxes', 'returns',
  'reviews', 'memberships', 'codes', 'users',
  'brands', 'collections', 'locations',
];

export const RESOURCE_LABELS: Record<ManagedResource, string> = {
  products:    '📦 Products',
  orders:      '🛍️ Orders',
  payments:    '💳 Payments',
  boxes:       '📫 Boxes',
  returns:     '↩️ Returns & QC',
  reviews:     '⭐ Reviews',
  memberships: '💎 Memberships',
  codes:       '🔑 Referral Codes',
  users:       '👤 Users',
  brands:      '🏷️ Brands',
  collections: '🗂️ Collections',
  locations:   '📍 Locations',
};

export interface CreateManagerPayload {
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  notes?: string;
  permissions: Partial<Record<ManagedResource, Partial<ResourcePermission>>>;
}

export interface CreateManagerResult {
  success: boolean;
  manager: StaffMember;
  temp_password: string;
  email_sent: boolean;
  message: string;
}

export interface PermissionPresets {
  [presetName: string]: Partial<Record<ManagedResource, Partial<ResourcePermission>>>;
}

export async function listManagers(): Promise<{ managers: StaffMember[]; total: number }> {
  return request('/api/admin/staff');
}

export async function getManager(id: string): Promise<{ manager: StaffMember }> {
  return request(`/api/admin/staff/${id}`);
}

export async function createManager(payload: CreateManagerPayload): Promise<CreateManagerResult> {
  return request('/api/admin/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateManager(
  id: string,
  payload: Partial<Pick<StaffMember, 'full_name' | 'phone' | 'department' | 'notes' | 'is_active'>>,
): Promise<{ success: boolean; manager: StaffMember }> {
  return request(`/api/admin/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateManagerPermissions(
  id: string,
  permissions: Partial<Record<ManagedResource, Partial<ResourcePermission>>>,
): Promise<{ success: boolean; permissions: ResourcePermission[] }> {
  return request(`/api/admin/staff/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

export async function deleteManager(id: string): Promise<{ success: boolean }> {
  return request(`/api/admin/staff/${id}`, { method: 'DELETE' });
}

export async function getPresets(): Promise<{ presets: PermissionPresets; resources: ManagedResource[] }> {
  return request('/api/admin/staff/presets');
}

export async function getAuditLog(params?: { limit?: number; offset?: number; resource?: string }) {
  const qs = new URLSearchParams();
  if (params?.limit)    qs.set('limit', String(params.limit));
  if (params?.offset)   qs.set('offset', String(params.offset));
  if (params?.resource) qs.set('resource', params.resource);
  return request(`/api/admin/staff/audit-log?${qs.toString()}`);
}

/** Build a blank full-deny permission map for all resources. */
export function buildDefaultPermissions(): Record<ManagedResource, ResourcePermission> {
  return Object.fromEntries(
    ALL_RESOURCES.map((r) => [r, { resource: r, can_view: false, can_create: false, can_edit: false, can_delete: false }]),
  ) as Record<ManagedResource, ResourcePermission>;
}
