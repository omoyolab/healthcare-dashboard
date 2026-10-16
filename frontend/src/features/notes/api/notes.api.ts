import { request } from "@/lib/api/client";
import type { Page } from "@/lib/api/types";

import type { ClinicalNote } from "../types";

export function listNotes(patientId: string, signal?: AbortSignal): Promise<Page<ClinicalNote>> {
  return request<Page<ClinicalNote>>(`/patients/${patientId}/notes`, {
    searchParams: new URLSearchParams({ page_size: "50" }),
    signal,
  });
}

export function addNote(patientId: string, content: string): Promise<ClinicalNote> {
  return request<ClinicalNote>(`/patients/${patientId}/notes`, {
    method: "POST",
    body: { content },
  });
}

export function deleteNote(patientId: string, noteId: string): Promise<void> {
  return request<void>(`/patients/${patientId}/notes/${noteId}`, { method: "DELETE" });
}
