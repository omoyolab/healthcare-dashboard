import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { patientKeys } from "@/features/patients/api/patients.keys";
import type { Page } from "@/lib/api/types";

import type { ClinicalNote } from "../types";

import { addNote, deleteNote, listNotes } from "./notes.api";
import { noteKeys } from "./notes.keys";

export function useNotes(patientId: string) {
  return useQuery({
    queryKey: noteKeys.list(patientId),
    queryFn: ({ signal }) => listNotes(patientId, signal),
  });
}

export function useAddNote(patientId: string) {
  const queryClient = useQueryClient();
  const listKey = noteKeys.list(patientId);

  return useMutation({
    mutationFn: (content: string) => addNote(patientId, content),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Page<ClinicalNote>>(listKey);
      const now = new Date().toISOString();
      const optimistic: ClinicalNote = {
        id: `optimistic-${now}`,
        patient_id: patientId,
        content,
        authored_at: now,
        created_at: now,
      };

      queryClient.setQueryData<Page<ClinicalNote>>(listKey, (current) =>
        current
          ? { ...current, items: [optimistic, ...current.items], total: current.total + 1 }
          : current,
      );
      return { previous };
    },
    onError: (_error, _content, context) => {
      // Put the list back exactly as it was, so a failed save loses nothing.
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      // The summary narrative is derived from notes: leaving it cached would
      // show a narrative that contradicts the note list on screen.
      void queryClient.invalidateQueries({ queryKey: patientKeys.summary(patientId) });
    },
  });
}

export function useDeleteNote(patientId: string) {
  const queryClient = useQueryClient();
  const listKey = noteKeys.list(patientId);

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(patientId, noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Page<ClinicalNote>>(listKey);

      queryClient.setQueryData<Page<ClinicalNote>>(listKey, (current) =>
        current
          ? {
              ...current,
              items: current.items.filter((note) => note.id !== noteId),
              total: Math.max(current.total - 1, 0),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _noteId, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: patientKeys.summary(patientId) });
    },
  });
}
