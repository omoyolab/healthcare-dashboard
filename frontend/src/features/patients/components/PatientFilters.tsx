import { Check, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import type { usePatientListParams } from "../hooks/usePatientListParams";
import { PAGE_SIZES, PATIENT_STATUSES, type PatientStatus } from "../types";

const STATUS_LABELS: Record<PatientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  discharged: "Discharged",
};

type ListParams = ReturnType<typeof usePatientListParams>;

export function PatientFilters({ params, update, toggleStatus }: ListParams) {
  // The field stays local and instant; only the debounced value reaches the URL.
  const [term, setTerm] = useState(params.q);
  const [syncedQuery, setSyncedQuery] = useState(params.q);

  // Adjusting state during render (React's documented pattern) keeps the box in
  // step with back/forward navigation without an effect.
  if (params.q !== syncedQuery) {
    setSyncedQuery(params.q);
    setTerm(params.q);
  }

  const pushQuery = useDebouncedCallback((value: string) => {
    setSyncedQuery(value);
    update({ q: value }, { replace: true });
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-56 flex-1">
        <label htmlFor="patient-search" className="sr-only">
          Search patients
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
          />
          <Input
            id="patient-search"
            type="search"
            className="pl-9"
            placeholder="Search by name or email"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              pushQuery(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span id="status-filter-label" className="text-sm text-content-muted">
          Status
        </span>
        {/* Multi-select: each status toggles on its own, so "inactive" and
            "discharged" can be shown together. "All" is the no-filter state,
            which is otherwise indistinguishable from having every status
            selected. */}
        <div
          role="group"
          aria-labelledby="status-filter-label"
          className="flex items-center gap-1.5"
        >
          <Button
            variant={params.status.length === 0 ? "primary" : "secondary"}
            size="sm"
            aria-pressed={params.status.length === 0}
            onClick={() => update({ status: [] })}
          >
            {params.status.length === 0 && <Check aria-hidden className="size-3.5" />}
            All
          </Button>
          {PATIENT_STATUSES.map((status) => {
            const active = params.status.includes(status);
            return (
              <Button
                key={status}
                variant={active ? "primary" : "secondary"}
                size="sm"
                aria-pressed={active}
                onClick={() => toggleStatus(status)}
              >
                {active && <Check aria-hidden className="size-3.5" />}
                {STATUS_LABELS[status]}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="text-sm text-content-muted">
          Rows
        </label>
        <Select
          id="page-size"
          className="h-8 w-20"
          value={String(params.pageSize)}
          onChange={(event) => update({ pageSize: Number(event.target.value) })}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
