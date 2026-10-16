export const noteKeys = {
  all: ["notes"] as const,
  list: (patientId: string) => [...noteKeys.all, "list", patientId] as const,
};
