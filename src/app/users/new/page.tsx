'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UserForm from '@/components/user-form/UserForm';
import type { OnboardingSubmission } from '@/types/user';

function NewUserContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const isAdmin = roleParam === 'admin';

  const initialData: Partial<OnboardingSubmission> | undefined = isAdmin
    ? {
        role: 'admin',
        approval_status: 'approved',
        admin_notes: 'Administrator Account',
        city: 'Mumbai',
      }
    : undefined;

  return <UserForm mode="create" initial={initialData as OnboardingSubmission} />;
}

export default function NewUserPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Loading form…</div>}>
      <NewUserContent />
    </Suspense>
  );
}
