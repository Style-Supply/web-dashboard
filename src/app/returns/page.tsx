'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReturnsRedirectPage(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    router.replace('/boxes?status=returns_review');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-sm text-neutral-500">Redirecting to Boxes & Returns…</div>
    </div>
  );
}
