import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientList } from "@/features/patients/api/patients.queries";
import { PatientStatusBadge } from "@/features/patients/components/PatientStatusBadge";
import { formatRelative } from "@/lib/utils/date";

const RECENT_COUNT = 5;

/** Reuses the list endpoint rather than adding a second one for five rows. */
export function RecentPatients() {
  const { data, isLoading } = usePatientList({
    page: 1,
    pageSize: RECENT_COUNT,
    q: "",
    status: [],
    sort: "-last_visit_at",
  });

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Recently seen</CardTitle>
        <Link
          to="/patients?sort=-last_visit_at"
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
        >
          View all
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: RECENT_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No patients yet" />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border-subtle">
          {data.items.map((patient) => (
            <li key={patient.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                to={`/patients/${patient.id}`}
                className="truncate text-sm font-medium text-content hover:text-accent hover:underline"
              >
                {patient.last_name}, {patient.first_name}
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-content-muted">
                  {formatRelative(patient.last_visit_at)}
                </span>
                <PatientStatusBadge status={patient.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
