import { z } from "zod";

/**
 * Mirrors the server rules in backend/app/schemas/note.py. The server stays the
 * authority; this exists so the user gets feedback before a round trip.
 */
export const noteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write something before saving")
    .max(5000, "Notes are limited to 5000 characters"),
});

export type NoteFormValues = z.infer<typeof noteSchema>;
