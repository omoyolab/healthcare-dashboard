import { z } from "zod";

import { BLOOD_TYPES, PATIENT_STATUSES, type Patient } from "../types";

const MAX_AGE_YEARS = 130;

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Mirrors backend/app/schemas/patient.py. The server remains the authority;
 * this exists so the user sees problems before a round trip (ADR 0005).
 */
export const patientFormSchema = z.object({
  first_name: z.string().trim().min(1, "Required").max(100, "Too long"),
  last_name: z.string().trim().min(1, "Required").max(100, "Too long"),
  date_of_birth: z
    .string()
    .min(1, "Required")
    .refine((value) => new Date(value) < new Date(), "Must be in the past")
    .refine((value) => {
      const years = (Date.now() - new Date(value).getTime()) / 31_557_600_000;
      return years <= MAX_AGE_YEARS;
    }, `Implies an age over ${MAX_AGE_YEARS}`),
  // refine, not union: a union reports its own error and loses this message.
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Enter a valid email address",
    }),
  phone: z.string().trim().max(32, "Too long"),
  address_line1: z.string().trim().max(200, "Too long"),
  address_line2: z.string().trim().max(200, "Too long"),
  city: z.string().trim().max(100, "Too long"),
  state: z.string().trim().max(100, "Too long"),
  postal_code: z.string().trim().max(20, "Too long"),
  blood_type: z.union([z.literal(""), z.enum(BLOOD_TYPES)]),
  status: z.enum(PATIENT_STATUSES),
  allergies: z.string(),
  conditions: z.string(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const emptyPatientForm: PatientFormValues = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  blood_type: "",
  status: "active",
  allergies: "",
  conditions: "",
};

export function toFormValues(patient: Patient): PatientFormValues {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    email: patient.email ?? "",
    phone: patient.phone ?? "",
    address_line1: patient.address_line1 ?? "",
    address_line2: patient.address_line2 ?? "",
    city: patient.city ?? "",
    state: patient.state ?? "",
    postal_code: patient.postal_code ?? "",
    blood_type: patient.blood_type ?? "",
    status: patient.status,
    allergies: patient.allergies.join(", "),
    conditions: patient.conditions.join(", "),
  };
}

/** Empty strings become null: the API distinguishes "not provided" from "". */
export function toPayload(values: PatientFormValues) {
  const nullable = (value: string) => (value.trim() === "" ? null : value.trim());
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    date_of_birth: values.date_of_birth,
    email: nullable(values.email),
    phone: nullable(values.phone),
    address_line1: nullable(values.address_line1),
    address_line2: nullable(values.address_line2),
    city: nullable(values.city),
    state: nullable(values.state),
    postal_code: nullable(values.postal_code),
    blood_type: values.blood_type === "" ? null : values.blood_type,
    status: values.status,
    allergies: parseList(values.allergies),
    conditions: parseList(values.conditions),
  };
}
