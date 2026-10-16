import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

import type { PatientStats, PatientStatus } from "@/features/patients/types";

const SERIES: { status: PatientStatus; label: string; bar: string }[] = [
  { status: "active", label: "Active", bar: "bg-status-active" },
  { status: "inactive", label: "Inactive", bar: "bg-status-inactive" },
  { status: "discharged", label: "Discharged", bar: "bg-status-discharged" },
];

interface StatusChartProps {
  stats?: PatientStats;
  isLoading: boolean;
}

/**
 * Three categories with exact counts: a labelled bar chart, not a pie. Every bar
 * carries its label and number, so identity never depends on colour - which is
 * also what keeps it readable under colour-vision deficiency.
 */
export function StatusChart({ stats, isLoading }: StatusChartProps) {
  if (isLoading || !stats) {
    return (
      <Card>
        <CardTitle>Status distribution</CardTitle>
        <Skeleton className="mt-4 h-32 w-full" />
      </Card>
    );
  }

  const max = Math.max(...SERIES.map((series) => stats.by_status[series.status]), 1);

  return (
    <Card>
      <CardTitle>Status distribution</CardTitle>
      <dl className="mt-5 space-y-4">
        {SERIES.map((series) => {
          const value = stats.by_status[series.status];
          const share = stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;

          return (
            // A wrapper inside <dl> may contain only <dt> and <dd>, so the bar
            // lives inside the <dd> next to its value.
            <div key={series.status} className="grid grid-cols-[7rem_1fr] items-center gap-3">
              <dt className="text-sm text-content">{series.label}</dt>
              <dd className="flex items-center gap-3">
                <div className="h-2.5 flex-1 rounded-full bg-surface-sunken">
                  <div
                    className={cn("h-full rounded-full", series.bar)}
                    // Scaled to the largest category so small ones stay visible.
                    style={{ width: `${Math.round((value / max) * 100)}%` }}
                  />
                </div>
                <span className="w-20 text-right text-sm tabular-nums text-content-muted">
                  <span className="font-medium text-content">{value}</span> · {share}%
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}
