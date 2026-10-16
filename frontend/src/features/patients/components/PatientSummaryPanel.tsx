import { ErrorState } from "@/components/feedback/ErrorState";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { usePatientSummary } from "../api/patients.queries";

export function PatientSummaryPanel({ patientId }: { patientId: string }) {
  const { data, error, isLoading, refetch } = usePatientSummary(patientId);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Summary</CardTitle>
        {data && (
          // Say what wrote this: a clinician is entitled to know it is generated.
          <span className="text-xs text-content-muted">
            Generated from {data.note_count} {data.note_count === 1 ? "note" : "notes"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <div className="mt-3">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      ) : data ? (
        <p className="mt-3 text-sm leading-relaxed text-content">{data.narrative}</p>
      ) : null}
    </Card>
  );
}
