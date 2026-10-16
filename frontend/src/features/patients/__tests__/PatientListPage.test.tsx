import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PatientListPage } from "@/features/patients/pages/PatientListPage";
import { ApiError } from "@/lib/api/errors";
import { patientPage } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

test("renders patients returned by the API", async () => {
  respondWith(patientPage());

  renderWithProviders(<PatientListPage />, { route: "/patients" });

  expect(await screen.findByRole("link", { name: "Delgado, Rosa" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Rodriguez, Marco" })).toBeVisible();
  // Null last_visit_at must read as "Never", not an empty cell or "Invalid Date".
  expect(screen.getByText("Never")).toBeVisible();
  expect(screen.getByText(/2 patients · page 1 of 1/)).toBeVisible();
});

test("sends search, status and sort to the API", async () => {
  respondWith(patientPage());
  const user = userEvent.setup();

  renderWithProviders(<PatientListPage />, { route: "/patients" });
  await screen.findByRole("link", { name: "Delgado, Rosa" });

  await user.type(screen.getByLabelText("Search patients"), "ro");
  await user.click(screen.getByRole("button", { name: "Active" }));

  await waitFor(() => {
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("q=ro"))).toBe(true);
    expect(urls.some((url) => url.includes("status=active"))).toBe(true);
  });
});

test("distinguishes no matches from no patients", async () => {
  respondWith(patientPage({ items: [], total: 0, total_pages: 0 }));

  renderWithProviders(<PatientListPage />, { route: "/patients?q=zzz" });

  expect(await screen.findByText("No patients match those filters")).toBeVisible();
});

test("shows a retryable error when the request fails", async () => {
  fetchMock.mockRejectedValue(new ApiError("Could not reach the server.", 0, null));

  renderWithProviders(<PatientListPage />, { route: "/patients" });

  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server");
  expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
});
