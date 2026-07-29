'use client';

import { RESOURCE_LABELS, type ManagedResource } from '@/lib/staff';

interface Props {
  resource?: ManagedResource;
  action?: string;
  message?: string;
}

export default function AccessDenied({ resource, action, message }: Props) {
  const resourceLabel = resource ? RESOURCE_LABELS[resource] : null;
  const description = message
    ?? (resourceLabel
      ? `You don't have permission to ${action ?? 'access'} ${resourceLabel}.`
      : "You don't have permission to access this section.");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-100 text-4xl shadow-inner">
        🔒
      </div>
      <h2 className="mb-2 text-xl font-bold text-neutral-800">Access Restricted</h2>
      <p className="max-w-sm text-sm text-neutral-500 leading-relaxed">{description}</p>
      <p className="mt-4 text-xs text-neutral-400">
        Contact your administrator to request access.
      </p>
    </div>
  );
}
