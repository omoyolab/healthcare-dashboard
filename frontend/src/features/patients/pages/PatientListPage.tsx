import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { buttonStyles } from "@/components/ui/button";

import { usePatientList } from "../api/patients.queries";
import { PatientFilters } from "../components/PatientFilters";
import { PatientPagination } from "../components/PatientPagination";
import { PatientTable, PatientTableSkeleton } from "../components/PatientTable";
import { usePatientListParams } from "../hooks/usePatientListParams";

export function PatientListPage() {
  const listParams = usePatientListParams();
  const { params, update, toggleSort } = listParams;
  const { data, error, isLoading, isFetching, refetch } = usePatientList(params);

  const isFiltered = Boolean(params.q) || params.status.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-content">Patients</h1>
        <Link to="/patients/new" className={buttonStyles({ size: "sm" })}>
          <UserPlus aria-hidden className="size-4" />
          Add patient
        </Link>
      </div>

      <PatientFilters {...listParams} />

      {isLoading ? (
        <PatientTableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data && data.items.length > 0 ? (
        <>
          <PatientTable
            patients={data.items}
            sort={params.sort}
            onSort={toggleSort}
            isPending={isFetching}
          />
          <PatientPagination
            page={data.page}
            totalPages={data.total_pages}
            total={data.total}
            hasNext={data.has_next}
            hasPrevious={data.has_previous}
            onChange={update}
          />
        </>
      ) : (
        // "No matches" and "no patients yet" are different problems.
        <EmptyState
          title={isFiltered ? "No patients match those filters" : "No patients yet"}
          description={
            isFiltered ? "Try a different search term or clear the filters." : "Add the first one."
          }
        />
      )}
    </div>
  );
}
