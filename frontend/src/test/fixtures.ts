import type { Page } from "@/lib/api/types";
import type { PatientListItem } from "@/features/patients/types";

export function patientPage(overrides: Partial<Page<PatientListItem>> = {}): Page<PatientListItem> {
  return {
    items: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        first_name: "Rosa",
        last_name: "Delgado",
        date_of_birth: "1981-03-14",
        age: 45,
        status: "active",
        last_visit_at: "2026-09-28T14:05:00Z",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        first_name: "Marco",
        last_name: "Rodriguez",
        date_of_birth: "1972-01-09",
        age: 54,
        status: "inactive",
        last_visit_at: null,
      },
    ],
    total: 2,
    page: 1,
    page_size: 25,
    total_pages: 1,
    has_next: false,
    has_previous: false,
    ...overrides,
  };
}
