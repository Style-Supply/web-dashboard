'use client';

import { useAuth, type AppRole } from '@/context/AuthContext';
import type { ManagedResource, PermissionAction } from '@/lib/staff';

export interface UsePermissionResult {
  role: AppRole | null;
  isAdmin: boolean;
  isManager: boolean;
  /** Returns true if the user can perform the action on the resource. Admins always return true. */
  can: (resource: ManagedResource, action: PermissionAction) => boolean;
  /** True if the user can view this resource (shorthand). */
  canView: (resource: ManagedResource) => boolean;
  /** True if the user can create in this resource (shorthand). */
  canCreate: (resource: ManagedResource) => boolean;
  /** True if the user can edit in this resource (shorthand). */
  canEdit: (resource: ManagedResource) => boolean;
  /** True if the user can delete in this resource (shorthand). */
  canDelete: (resource: ManagedResource) => boolean;
}

/**
 * Convenience hook for checking permissions in components.
 *
 * @example
 * const { can, isAdmin } = usePermission();
 *
 * // In JSX:
 * {can('products', 'delete') && <DeleteButton />}
 * {canView('payments') ? <PaymentsList /> : <AccessDenied resource="payments" />}
 */
export function usePermission(): UsePermissionResult {
  const { role, can } = useAuth();

  return {
    role,
    isAdmin:   role === 'admin',
    isManager: role === 'manager',
    can,
    canView:   (resource) => can(resource, 'view'),
    canCreate: (resource) => can(resource, 'create'),
    canEdit:   (resource) => can(resource, 'edit'),
    canDelete: (resource) => can(resource, 'delete'),
  };
}
