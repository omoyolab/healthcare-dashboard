import { Button } from "@/components/ui/button";

import type { PatientListParams } from "../types";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onChange: (changes: Partial<PatientListParams>) => void;
}

export function PatientPagination({
  page,
  totalPages,
  total,
  hasNext,
  hasPrevious,
  onChange,
}: PaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-content-muted" aria-live="polite">
        {total} {total === 1 ? "patient" : "patients"} · page {page} of {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onChange({ page: page - 1 })}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNext}
          onClick={() => onChange({ page: page + 1 })}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
