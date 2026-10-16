import type { PatientListParams } from "../types";

/**
 * One factory for every cache key. Hand-written key arrays are the usual reason
 * a list fails to refresh after a save.
 */
export const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (params: PatientListParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  summary: (id: string) => [...patientKeys.all, "summary", id] as const,
  stats: () => [...patientKeys.all, "stats"] as const,
};
