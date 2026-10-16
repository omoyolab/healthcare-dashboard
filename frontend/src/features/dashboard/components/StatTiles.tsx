import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { PatientStats } from "@/features/patients/types";

interface StatTilesProps {
  stats?: PatientStats;
  isLoading: boolean;
}

export function StatTiles({ stats, isLoading }: StatTilesProps) {
  const tiles = [
    { label: "Total patients", value: stats?.total },
    { label: "Active", value: stats?.by_status.active },
    { label: "Seen in last 30 days", value: stats?.seen_last_30_days },
    { label: "Never seen", value: stats?.never_seen },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardTitle className="text-sm font-medium text-content-muted">{tile.label}</CardTitle>
          {isLoading || tile.value === undefined ? (
            <Skeleton className="mt-3 h-8 w-16" />
          ) : (
            // A headline number needs no chart.
            <p className="mt-2 text-3xl font-semibold tabular-nums text-content">{tile.value}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
