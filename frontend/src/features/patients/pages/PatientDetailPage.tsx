import { ArrowLeft, Pencil } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ErrorState } from "@/components/feedback/ErrorState";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteForm } from "@/features/notes/components/NoteForm";
import { NoteList } from "@/features/notes/components/NoteList";

import { usePatient } from "../api/patients.queries";
import { DeletePatientDialog } from "../components/DeletePatientDialog";
import { PatientProfileCard } from "../components/PatientProfileCard";
import { PatientStatusBadge } from "../components/PatientStatusBadge";
import { PatientSummaryPanel } from "../components/PatientSummaryPanel";

export function PatientDetailPage() {
  const { patientId = "" } = useParams();
  const { data: patient, error, isLoading, refetch } = usePatient(patientId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!patient) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/patients"
            className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Patients
          </Link>
          <h1 className="text-xl font-semibold text-content">
            {patient.first_name} {patient.last_name}
          </h1>
          <PatientStatusBadge status={patient.status} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/patients/${patient.id}/edit`}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            <Pencil aria-hidden className="size-4" />
            Edit
          </Link>
          <DeletePatientDialog
            patientId={patient.id}
            patientName={`${patient.first_name} ${patient.last_name}`}
          />
        </div>
      </div>

      <PatientSummaryPanel patientId={patient.id} />
      <PatientProfileCard patient={patient} />

      <Card>
        <CardTitle>Clinical notes</CardTitle>
        <div className="mt-4 space-y-5">
          <NoteForm patientId={patient.id} />
          <NoteList patientId={patient.id} />
        </div>
      </Card>
    </div>
  );
}
