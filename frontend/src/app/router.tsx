import { createBrowserRouter } from "react-router-dom";

import { PageFallback } from "@/components/feedback/LoadingState";
import { RouteError } from "@/components/feedback/RouteError";
import { AppShell } from "@/components/layout/AppShell";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * Pages are lazy from the first commit: retrofitting code splitting later means
 * untangling an import graph that has already grown.
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    // Both are required for a lazy-route app: without HydrateFallback the first
    // paint is blank, and without an error element a failed chunk is silent.
    HydrateFallback: PageFallback,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { DashboardPage } = await import("@/features/dashboard/pages/DashboardPage");
          return { Component: DashboardPage };
        },
      },
      {
        path: "patients",
        lazy: async () => {
          const { PatientListPage } = await import("@/features/patients/pages/PatientListPage");
          return { Component: PatientListPage };
        },
      },
      {
        path: "patients/new",
        lazy: async () => {
          const { PatientCreatePage } = await import("@/features/patients/pages/PatientCreatePage");
          return { Component: PatientCreatePage };
        },
      },
      {
        path: "patients/:patientId",
        lazy: async () => {
          const { PatientDetailPage } = await import("@/features/patients/pages/PatientDetailPage");
          return { Component: PatientDetailPage };
        },
      },
      {
        path: "patients/:patientId/edit",
        lazy: async () => {
          const { PatientEditPage } = await import("@/features/patients/pages/PatientEditPage");
          return { Component: PatientEditPage };
        },
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
