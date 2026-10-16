/** UI-facing patient types. Mirrors the backend contract in docs/API.md. */

export const PATIENT_STATUSES = ["active", "inactive", "discharged"] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

/** The list projection: what the table renders, nothing more. */
export interface PatientListItem {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  status: PatientStatus;
  last_visit_at: string | null;
}

export interface Patient extends PatientListItem {
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  blood_type: BloodType | null;
  allergies: string[];
  conditions: string[];
  created_at: string;
  updated_at: string;
}

export const SORT_FIELDS = [
  "last_name",
  "first_name",
  "date_of_birth",
  "last_visit_at",
  "created_at",
] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const PAGE_SIZES = [25, 50, 100] as const;

export interface PatientListParams {
  page: number;
  pageSize: number;
  q: string;
  status: PatientStatus[];
  sort: string;
}

export interface PatientSummary {
  patient_id: string;
  name: string;
  age: number;
  blood_type: BloodType | null;
  narrative: string;
  conditions: string[];
  allergies: string[];
  note_count: number;
  generated_by: "template";
  generated_at: string;
}

export interface PatientStats {
  total: number;
  by_status: Record<PatientStatus, number>;
  never_seen: number;
  seen_last_30_days: number;
}
