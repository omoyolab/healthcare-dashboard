import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/errors";

import { useAddNote } from "../api/notes.queries";
import { noteSchema, type NoteFormValues } from "../schemas/note.schema";

export function NoteForm({ patientId }: { patientId: string }) {
  const addNote = useAddNote(patientId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await addNote.mutateAsync(values.content);
      reset();
    } catch {
      // Surfaced below; the typed text stays in the field so nothing is lost.
    }
  });

  const serverError =
    addNote.error instanceof ApiError
      ? addNote.error.message
      : addNote.error
        ? String(addNote.error)
        : null;

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
      <Field id="note-content" label="Add a clinical note" error={errors.content?.message}>
        <Textarea
          id="note-content"
          rows={3}
          placeholder="What was observed, and what happens next?"
          aria-invalid={Boolean(errors.content)}
          {...register("content")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="text-xs text-danger">
          {serverError}
        </p>
      )}

      <Button type="submit" size="sm" disabled={isSubmitting || addNote.isPending}>
        <Plus aria-hidden className="size-4" />
        {addNote.isPending ? "Saving…" : "Save note"}
      </Button>
    </form>
  );
}
