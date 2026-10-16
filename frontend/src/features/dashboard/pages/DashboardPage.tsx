import { Link } from "react-router-dom";

import { ErrorState } from "@/components/feedback/ErrorState";
import { buttonStyles } from "@/components/ui/button";
import { usePatientStats } from "@/features/patients/api/patients.queries";

import { StatTiles } from "../components/StatTiles";
import { RecentPatients } from "../components/RecentPatients";
import { StatusChart } from "../components/StatusChart";

export function DashboardPage() {
  const { data, error, isLoading, refetch } = usePatientStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-content">Overview</h1>
        <Link to="/patients" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          View all patients
        </Link>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <StatTiles stats={data} isLoading={isLoading} />
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusChart stats={data} isLoading={isLoading} />
            <RecentPatients />
          </div>
        </>
      )}
    </div>
  );
}
