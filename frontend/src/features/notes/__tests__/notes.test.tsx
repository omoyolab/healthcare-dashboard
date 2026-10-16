import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PatientDetailPage } from "@/features/patients/pages/PatientDetailPage";
import { renderWithProviders } from "@/test/render";

const PATIENT_ID = "11111111-1111-1111-1111-111111111111";

const patient = {
  id: PATIENT_ID,
  first_name: "Rosa",
  last_name: "Delgado",
  date_of_birth: "1981-03-14",
  age: 45,
  status: "active",
  last_visit_at: "2026-09-28T14:05:00Z",
  email: "rosa@example.com",
  phone: null,
  address_line1: null,
  address_line2: null,
  city: "San Francisco",
  state: "CA",
  postal_code: null,
  blood_type: "O+",
  allergies: ["penicillin"],
  conditions: ["type 2 diabetes"],
  created_at: "2026-01-12T09:00:00Z",
  updated_at: "2026-09-28T14:05:00Z",
};

const note = {
  id: "aaaa1111-1111-1111-1111-111111111111",
  patient_id: PATIENT_ID,
  authored_at: "2026-09-28T14:20:00Z",
  content: "Glucose control improved.",
  created_at: "2026-09-28T14:21:00Z",
};

function page<T>(items: T[]) {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 50,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  };
}

const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let summaryRequests = 0;

beforeEach(() => {
  summaryRequests = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation((input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/summary")) {
      summaryRequests += 1;
      return Promise.resolve(
        json({
          patient_id: PATIENT_ID,
          name: "Rosa Delgado",
          age: 45,
          blood_type: "O+",
          narrative: `Narrative from ${summaryRequests} fetch(es).`,
          conditions: ["type 2 diabetes"],
          allergies: ["penicillin"],
          note_count: 1,
          generated_by: "template",
          generated_at: "2026-10-15T00:00:00Z",
        }),
      );
    }
    if (url.includes("/notes") && init?.method === "POST") {
      return Promise.resolve(json({ ...note, id: "new", content: "Reports a flare." }, 201));
    }
    if (url.includes("/notes") && init?.method === "DELETE")
      return Promise.resolve(json(null, 204));
    if (url.includes("/notes")) return Promise.resolve(json(page([note])));
    return Promise.resolve(json(patient));
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

test("shows profile, summary and notes", async () => {
  renderWithProviders(<PatientDetailPage />, { route: `/patients/${PATIENT_ID}` });

  expect(await screen.findByRole("heading", { name: "Rosa Delgado" })).toBeVisible();
  expect(await screen.findByText(/Narrative from/)).toBeVisible();
  expect(await screen.findByText("Glucose control improved.")).toBeVisible();
  expect(screen.getByText("penicillin")).toBeVisible();
});

test("adding a note refetches the summary, because the narrative derives from notes", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PatientDetailPage />, { route: `/patients/${PATIENT_ID}` });
  await screen.findByText(/Narrative from 1 fetch/);

  await user.type(screen.getByLabelText("Add a clinical note"), "Reports a flare.");
  await user.click(screen.getByRole("button", { name: "Save note" }));

  await waitFor(() => expect(summaryRequests).toBeGreaterThan(1));
});

test("an empty note is rejected before any request is made", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PatientDetailPage />, { route: `/patients/${PATIENT_ID}` });
  await screen.findByRole("heading", { name: "Rosa Delgado" });

  const countPosts = () =>
    fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")
      .length;
  const postsBefore = countPosts();
  await user.type(screen.getByLabelText("Add a clinical note"), "   ");
  await user.click(screen.getByRole("button", { name: "Save note" }));

  expect(await screen.findByText("Write something before saving")).toBeVisible();
  expect(countPosts()).toBe(postsBefore);
});

test("a failed delete puts the note back", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PatientDetailPage />, { route: `/patients/${PATIENT_ID}` });
  const noteText = await screen.findByText("Glucose control improved.");
  expect(noteText).toBeVisible();

  fetchMock.mockImplementation((input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/notes") && init?.method === "DELETE") {
      return Promise.resolve(json({ detail: "boom" }, 500));
    }
    if (url.includes("/summary")) return Promise.resolve(json({ narrative: "x", note_count: 1 }));
    if (url.includes("/notes")) return Promise.resolve(json(page([note])));
    return Promise.resolve(json(patient));
  });

  const list = screen.getByRole("list");
  await user.click(within(list).getByRole("button", { name: /Delete note/ }));

  // Optimistically removed, then restored when the server rejects it.
  await waitFor(() => expect(screen.getByText("Glucose control improved.")).toBeVisible());
});
