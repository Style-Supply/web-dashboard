'use client';

import Button from '@/components/ui/Button';

type BulkBusy = false | 'delete' | 'pending' | 'approved' | 'rejected';

interface UserBulkActionBarProps {
  selectedIds: string[];
  busy?: BulkBusy;
  onDelete: () => void;
  onStatusChange: (status: 'pending' | 'approved' | 'rejected') => void;
}

export default function UserBulkActionBar({
  selectedIds,
  busy = false,
  onDelete,
  onStatusChange,
}: UserBulkActionBarProps): React.ReactElement | null {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded bg-[color:var(--color-ink)] px-4 py-2 text-white">
      <span className="text-sm">{selectedIds.length} selected</span>
      <Button
        variant="secondary"
        size="sm"
        loading={busy === 'approved'}
        disabled={!!busy}
        onClick={() => onStatusChange('approved')}
      >
        Approve
      </Button>
      <Button
        variant="secondary"
        size="sm"
        loading={busy === 'rejected'}
        disabled={!!busy}
        onClick={() => onStatusChange('rejected')}
      >
        Reject
      </Button>
      <Button
        variant="secondary"
        size="sm"
        loading={busy === 'pending'}
        disabled={!!busy}
        onClick={() => onStatusChange('pending')}
      >
        Mark pending
      </Button>
      <Button
        variant="primary"
        size="sm"
        loading={busy === 'delete'}
        disabled={!!busy}
        onClick={onDelete}
      >
        Delete
      </Button>
    </div>
  );
}
