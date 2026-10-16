import { request } from "@/lib/api/client";
import type { Page } from "@/lib/api/types";

import type {
  Patient,
  PatientListItem,
  PatientListParams,
  PatientStats,
  PatientSummary,
} from "../types";

function toSearchParams(params: PatientListParams): URLSearchParams {
  const search = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
    sort: params.sort,
  });
  if (params.q.trim()) search.set("q", params.q.trim());
  // Repeated key, matching the backend's list[PatientStatus] query model.
  for (const status of params.status) search.append("status", status);
  return search;
}

export function listPatients(
  params: PatientListParams,
  signal?: AbortSignal,
): Promise<Page<PatientListItem>> {
  return request<Page<PatientListItem>>("/patients", {
    searchParams: toSearchParams(params),
    signal,
  });
}

export function getPatient(patientId: string, signal?: AbortSignal): Promise<Patient> {
  return request<Patient>(`/patients/${patientId}`, { signal });
}

export function getPatientSummary(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientSummary> {
  return request<PatientSummary>(`/patients/${patientId}/summary`, { signal });
}

export function createPatient(payload: unknown): Promise<Patient> {
  return request<Patient>("/patients", { method: "POST", body: payload });
}

export function updatePatient(patientId: string, payload: unknown): Promise<Patient> {
  return request<Patient>(`/patients/${patientId}`, { method: "PUT", body: payload });
}

export function deletePatient(patientId: string): Promise<void> {
  return request<void>(`/patients/${patientId}`, { method: "DELETE" });
}

export function getPatientStats(signal?: AbortSignal): Promise<PatientStats> {
  return request<PatientStats>("/patients/stats", { signal });
}
