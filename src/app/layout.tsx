// Metadata must be in a Server Component — keep it here
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import SWRProvider from '@/components/providers/SWRProvider';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: 'StyleSupply Dashboard',
  description: 'Product management dashboard',
  icons: {
    icon: '/icon/Frame-white.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <html lang="en" className={manrope.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SWRProvider>
          <AppShell>{children}</AppShell>
        </SWRProvider>
      </body>
    </html>
  );
}
