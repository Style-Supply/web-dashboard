'use client';

import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[color:var(--color-primary)] ${className}`}
      {...rest}
    />
  );
});

export default Input;
