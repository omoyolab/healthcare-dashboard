import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/date";

import type { ClinicalNote } from "../types";

interface NoteItemProps {
  note: ClinicalNote;
  onDelete: (noteId: string) => void;
  isDeleting: boolean;
}

export function NoteItem({ note, onDelete, isDeleting }: NoteItemProps) {
  // Optimistic rows have no server id yet, so they cannot be deleted.
  const isOptimistic = note.id.startsWith("optimistic-");

  return (
    <li className="rounded-lg border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <time dateTime={note.authored_at} className="text-xs font-medium text-content-muted">
          {formatDateTime(note.authored_at)}
        </time>
        {!isOptimistic && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            aria-label={`Delete note from ${formatDateTime(note.authored_at)}`}
            onClick={() => onDelete(note.id)}
          >
            Delete
          </Button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-content">{note.content}</p>
    </li>
  );
}
