'use client';

import { SWRConfig, swrConfig } from '@/lib/swr';
import type { ReactNode } from 'react';

/** Client-side SWR cache provider — wraps the entire dashboard */
export default function SWRProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
