import { Skeleton } from "@/components/ui/skeleton";
import { Table, Td, Th } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";

import type { PatientListItem } from "../types";

import { PatientRow } from "./PatientRow";

interface PatientTableProps {
  patients: PatientListItem[];
  sort: string;
  onSort: (field: string) => void;
  isPending: boolean;
}

const COLUMNS = [
  { field: "last_name", label: "Patient", sortable: true },
  { field: "date_of_birth", label: "Age", sortable: true },
  { field: "last_visit_at", label: "Last visit", sortable: true },
  { field: "status", label: "Status", sortable: false },
] as const;

export function PatientTable({ patients, sort, onSort, isPending }: PatientTableProps) {
  const field = sort.replace(/^-/, "");
  const descending = sort.startsWith("-");

  return (
    <Table>
      <thead>
        <tr>
          {COLUMNS.map((column) => {
            const isSorted = column.sortable && field === column.field;
            return (
              <Th
                key={column.field}
                // aria-sort is how a screen reader announces the sorted column.
                aria-sort={isSorted ? (descending ? "descending" : "ascending") : undefined}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.field)}
                    className={cn(
                      "inline-flex items-center gap-1 uppercase hover:text-content",
                      isSorted && "text-content",
                    )}
                  >
                    {column.label}
                    <span aria-hidden>{isSorted ? (descending ? "▾" : "▴") : "↕"}</span>
                  </button>
                ) : (
                  column.label
                )}
              </Th>
            );
          })}
        </tr>
      </thead>
      <tbody className={cn(isPending && "opacity-60 transition-opacity")}>
        {patients.map((patient) => (
          <PatientRow key={patient.id} patient={patient} />
        ))}
      </tbody>
    </Table>
  );
}

export function PatientTableSkeleton() {
  return (
    <Table>
      <tbody>
        {Array.from({ length: 8 }, (_, index) => (
          <tr key={index}>
            <Td>
              <Skeleton className="h-4 w-48" />
            </Td>
            <Td>
              <Skeleton className="h-4 w-8" />
            </Td>
            <Td>
              <Skeleton className="h-4 w-28" />
            </Td>
            <Td>
              <Skeleton className="h-5 w-20 rounded-full" />
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
