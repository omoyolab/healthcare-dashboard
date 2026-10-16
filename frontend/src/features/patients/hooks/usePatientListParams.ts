import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { PAGE_SIZES, PATIENT_STATUSES, type PatientListParams, type PatientStatus } from "../types";

const DEFAULTS = { page: 1, pageSize: 25, q: "", sort: "last_name" } as const;

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : DEFAULTS.page;
}

function parsePageSize(raw: string | null): number {
  const size = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULTS.pageSize;
}

function parseStatus(raw: string[]): PatientStatus[] {
  return raw.filter((value): value is PatientStatus =>
    (PATIENT_STATUSES as readonly string[]).includes(value),
  );
}

/**
 * List state lives in the URL, not in component state: the view is shareable,
 * the back button behaves, and a reload keeps the user's filters.
 */
export function usePatientListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo<PatientListParams>(
    () => ({
      page: parsePage(searchParams.get("page")),
      pageSize: parsePageSize(searchParams.get("page_size")),
      q: searchParams.get("q") ?? DEFAULTS.q,
      status: parseStatus(searchParams.getAll("status")),
      sort: searchParams.get("sort") ?? DEFAULTS.sort,
    }),
    [searchParams],
  );

  const update = useCallback(
    (changes: Partial<PatientListParams>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      const merged = { ...params, ...changes };

      // Any change other than paging returns to page 1: staying on page 7 of a
      // new result set shows an empty table.
      const resetPage = changes.page === undefined;
      const page = resetPage ? 1 : merged.page;

      // Defaults are left out of the URL, so a plain /patients link stays clean.
      if (page === 1) next.delete("page");
      else next.set("page", String(page));

      if (merged.q) next.set("q", merged.q);
      else next.delete("q");

      if (merged.sort === DEFAULTS.sort) next.delete("sort");
      else next.set("sort", merged.sort);

      if (merged.pageSize === DEFAULTS.pageSize) next.delete("page_size");
      else next.set("page_size", String(merged.pageSize));
      next.delete("status");
      for (const status of merged.status) next.append("status", status);

      setSearchParams(next, { replace: options?.replace ?? false });
    },
    [params, searchParams, setSearchParams],
  );

  const toggleStatus = useCallback(
    (status: PatientStatus) => {
      const active = params.status.includes(status);
      update({
        status: active ? params.status.filter((s) => s !== status) : [...params.status, status],
      });
    },
    [params.status, update],
  );

  const toggleSort = useCallback(
    (field: string) => {
      const descending = params.sort === field;
      update({ sort: descending ? `-${field}` : field });
    },
    [params.sort, update],
  );

  return { params, update, toggleStatus, toggleSort };
}
