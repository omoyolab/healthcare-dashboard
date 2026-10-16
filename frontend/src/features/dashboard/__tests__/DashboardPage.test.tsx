import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { patientPage } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const stats = {
  total: 20,
  by_status: { active: 17, inactive: 2, discharged: 1 },
  never_seen: 2,
  seen_last_30_days: 9,
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  // The dashboard calls two endpoints now: the aggregate and the recent list.
  fetchMock.mockImplementation((input: string | URL) => {
    const url = String(input);
    const body = url.includes("/patients/stats") ? stats : patientPage();
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

/** Reads a tile by its label, so a number appearing elsewhere cannot match. */
function tileValue(label: string): string {
  const heading = screen.getByRole("heading", { name: label });
  return (heading.parentElement?.textContent ?? "").replace(label, "").trim();
}

test("shows headline counts from the stats endpoint", async () => {
  renderWithProviders(<DashboardPage />);
  await screen.findByText(/85%/);

  expect(tileValue("Total patients")).toBe("20");
  expect(tileValue("Active")).toBe("17");
  expect(tileValue("Seen in last 30 days")).toBe("9");
  expect(tileValue("Never seen")).toBe("2");
});

test("every chart bar is labelled with its value and share", async () => {
  renderWithProviders(<DashboardPage />);
  // Wait for data, not the card title: the title also renders while loading.
  await screen.findByText(/85%/);

  // Scoped to the chart: status words also appear on the recent patients list.
  const chart = screen.getByText("Status distribution").closest("div");
  const labels = within(chart as HTMLElement);
  expect(labels.getByText("Active")).toBeVisible();
  expect(labels.getByText("Inactive")).toBeVisible();
  expect(labels.getByText("Discharged")).toBeVisible();
  expect(labels.getByText(/85%/)).toBeVisible();
});

test("fetches one aggregate, not a request per status", async () => {
  renderWithProviders(<DashboardPage />);
  await screen.findByText(/85%/);

  const statsCalls = fetchMock.mock.calls.filter(([url]) =>
    String(url).includes("/patients/stats"),
  );
  expect(statsCalls).toHaveLength(1);
});

test("lists recently seen patients, newest visit first", async () => {
  renderWithProviders(<DashboardPage />);

  expect(await screen.findByText("Recently seen")).toBeVisible();
  expect(await screen.findByRole("link", { name: "Delgado, Rosa" })).toBeVisible();

  const listCall = fetchMock.mock.calls
    .map(([url]) => String(url))
    .find((url) => url.includes("/patients?"));
  expect(listCall).toContain("sort=-last_visit_at");
  expect(listCall).toContain("page_size=5");
});

test("bar width matches the percentage printed next to it", async () => {
  renderWithProviders(<DashboardPage />);
  await screen.findByText(/85%/);

  // Active is 17 of 20. The bar used to be scaled to the largest category, so
  // it rendered full width while the label said 85%.
  const activeBar = document.querySelector<HTMLElement>(".bg-status-active");
  expect(activeBar?.style.width).toContain("85%");

  const dischargedBar = document.querySelector<HTMLElement>(".bg-status-discharged");
  expect(dischargedBar?.style.width).toContain("5%");
});
