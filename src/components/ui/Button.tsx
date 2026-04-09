'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-[color:var(--color-primary)] text-white hover:opacity-90',
  secondary: 'bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-50',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition disabled:opacity-50 disabled:pointer-events-none ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
