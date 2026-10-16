import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

import type { PatientStatus } from "../types";

const DOT: Record<PatientStatus, string> = {
  active: "bg-status-active",
  inactive: "bg-status-inactive",
  discharged: "bg-status-discharged",
};

const LABELS: Record<PatientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  discharged: "Discharged",
};

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return (
    <Badge>
      {/* The dot carries the colour; the label stays in text ink, so the status
          is never communicated by colour alone and contrast is unaffected. */}
      <span aria-hidden className={cn("size-2 rounded-full", DOT[status])} />
      {LABELS[status]}
    </Badge>
  );
}
