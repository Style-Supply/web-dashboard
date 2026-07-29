'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Dialog({ open, onClose, children }: DialogProps): React.ReactElement {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-lg border border-neutral-200 bg-white p-6 backdrop:bg-black/40"
    >
      {children}
    </dialog>
  );
}
