import { FileText } from "lucide-react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { usePatientSummary } from "../api/patients.queries";

/**
 * Shows the narrative only. The facts it is built from live in the profile
 * card below, and repeating them here was just the same data twice.
 */
export function PatientSummaryPanel({ patientId }: { patientId: string }) {
  const { data, error, isLoading, refetch } = usePatientSummary(patientId);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <FileText aria-hidden className="size-4 text-content-muted" />
          Summary
        </CardTitle>
        {data && (
          // Say what produced this: it is generated, not written by a clinician.
          <span className="text-xs text-content-muted">
            Generated from {data.note_count} {data.note_count === 1 ? "note" : "notes"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <div className="mt-4">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      ) : data ? (
        <div className="mt-3 space-y-3">
          {data.narrative.map((paragraph, index) => (
            <p
              key={paragraph}
              className={
                // The last paragraph quotes the most recent note, so it reads as
                // a quotation rather than as more generated prose.
                index === data.narrative.length - 1 && data.note_count > 0
                  ? "border-l-2 border-border-subtle pl-3 text-sm italic leading-relaxed text-content-muted"
                  : "text-sm leading-relaxed text-content"
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
