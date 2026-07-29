'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UserForm from '@/components/user-form/UserForm';
import { getUser } from '@/lib/users';
import type { OnboardingSubmission } from '@/types/user';

export default function EditUserPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [user, setUser] = useState<OnboardingSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getUser(id)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load user');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-neutral-500">Loading…</div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error ?? 'User not found'}
        </div>
        <button
          onClick={() => router.push('/users')}
          className="text-sm text-[#7A021D] hover:underline"
        >
          ← Back to Users
        </button>
      </div>
    );
  }

  return <UserForm mode="edit" initial={user} />;
}
