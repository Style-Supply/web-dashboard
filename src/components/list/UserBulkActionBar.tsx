'use client';

import Button from '@/components/ui/Button';

type BulkBusy = false | 'delete';

interface UserBulkActionBarProps {
  selectedIds: string[];
  busy?: BulkBusy;
  onDelete: () => void;
}

export default function UserBulkActionBar({
  selectedIds,
  busy = false,
  onDelete,
}: UserBulkActionBarProps): React.ReactElement | null {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded bg-[color:var(--color-ink)] px-4 py-2 text-white">
      <span className="text-sm">{selectedIds.length} selected</span>
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
