import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

import { useDeleteNote, useNotes } from "../api/notes.queries";

import { NoteItem } from "./NoteItem";

export function NoteList({ patientId }: { patientId: string }) {
  const { data, error, isLoading, refetch } = useNotes(patientId);
  const deleteNote = useDeleteNote(patientId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (!data || data.items.length === 0) {
    return (
      <EmptyState title="No notes yet" description="Clinical notes appear here, newest first." />
    );
  }

  return (
    <ul className="space-y-3">
      {data.items.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          isDeleting={deleteNote.isPending && deleteNote.variables === note.id}
          onDelete={(noteId) => deleteNote.mutate(noteId)}
        />
      ))}
    </ul>
  );
}
