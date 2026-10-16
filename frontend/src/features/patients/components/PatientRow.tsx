import { memo } from "react";
import { Link } from "react-router-dom";

import { Td } from "@/components/ui/table";
import { formatDate, formatRelative } from "@/lib/utils/date";

import type { PatientListItem } from "../types";

import { PatientStatusBadge } from "./PatientStatusBadge";

/** Memoised so re-renders stay proportional to what actually changed. */
export const PatientRow = memo(function PatientRow({ patient }: { patient: PatientListItem }) {
  return (
    <tr className="hover:bg-surface-sunken">
      <Td>
        {/* The link is the name, not the row: a real link is keyboard reachable
            and can be opened in a new tab. */}
        <Link
          to={`/patients/${patient.id}`}
          className="font-medium text-content hover:text-accent hover:underline"
        >
          {patient.last_name}, {patient.first_name}
        </Link>
      </Td>
      <Td className="tabular-nums">{patient.age}</Td>
      <Td className="whitespace-nowrap text-content-muted">
        {formatRelative(patient.last_visit_at)}
        <span className="ml-2 hidden text-xs sm:inline">{formatDate(patient.last_visit_at)}</span>
      </Td>
      <Td>
        <PatientStatusBadge status={patient.status} />
      </Td>
    </tr>
  );
});
