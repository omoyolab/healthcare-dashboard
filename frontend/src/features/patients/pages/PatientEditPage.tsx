import { useNavigate, useParams } from "react-router-dom";

import { ErrorState } from "@/components/feedback/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

import { usePatient, useUpdatePatient } from "../api/patients.queries";
import { PatientForm } from "../components/PatientForm";
import { toFormValues } from "../schemas/patient.schema";

export function PatientEditPage() {
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const { data: patient, error, isLoading, refetch } = usePatient(patientId);
  const updatePatient = useUpdatePatient(patientId);

  if (isLoading) return <Skeleton className="h-96 w-full max-w-3xl" />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!patient) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-content">
        Edit {patient.first_name} {patient.last_name}
      </h1>
      <PatientForm
        defaultValues={toFormValues(patient)}
        submitLabel="Save changes"
        cancelTo={`/patients/${patient.id}`}
        onSubmit={async (payload) => {
          await updatePatient.mutateAsync(payload);
          void navigate(`/patients/${patient.id}`);
        }}
      />
    </div>
  );
}
