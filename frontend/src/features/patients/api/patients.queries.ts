import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Patient, PatientListParams } from "../types";

import {
  createPatient,
  deletePatient,
  getPatient,
  getPatientStats,
  getPatientSummary,
  listPatients,
  updatePatient,
} from "./patients.api";
import { patientKeys } from "./patients.keys";

export function usePatientList(params: PatientListParams) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: ({ signal }) => listPatients(params, signal),
    // Keeps the current page on screen while the next loads, so paging and
    // typing do not flash an empty table.
    placeholderData: keepPreviousData,
  });
}

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: patientKeys.detail(patientId),
    queryFn: ({ signal }) => getPatient(patientId, signal),
  });
}

export function usePatientSummary(patientId: string) {
  return useQuery({
    queryKey: patientKeys.summary(patientId),
    queryFn: ({ signal }) => getPatientSummary(patientId, signal),
  });
}

export function usePatientStats() {
  return useQuery({
    queryKey: patientKeys.stats(),
    queryFn: ({ signal }) => getPatientStats(signal),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => createPatient(payload),
    onSuccess: (patient: Patient) => {
      queryClient.setQueryData(patientKeys.detail(patient.id), patient);
      void queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => updatePatient(patientId, payload),
    onSuccess: (patient: Patient) => {
      queryClient.setQueryData(patientKeys.detail(patientId), patient);
      void queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      // Name, age, conditions and allergies all appear in the narrative.
      void queryClient.invalidateQueries({ queryKey: patientKeys.summary(patientId) });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => deletePatient(patientId),
    onSuccess: (_result, patientId) => {
      queryClient.removeQueries({ queryKey: patientKeys.detail(patientId) });
      void queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}
