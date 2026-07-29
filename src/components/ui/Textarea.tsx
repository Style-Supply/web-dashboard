'use client';

import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`min-h-[96px] w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--color-primary)] ${className}`}
      {...rest}
    />
  );
});

export default Textarea;
