import { screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
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
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
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

  // Identity and magnitude stay readable without colour.
  expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  expect(screen.getByText("Inactive")).toBeVisible();
  expect(screen.getByText("Discharged")).toBeVisible();
  expect(screen.getByText(/85%/)).toBeVisible();
});

test("fetches one aggregate, not a request per status", async () => {
  renderWithProviders(<DashboardPage />);
  await screen.findByText(/85%/);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/patients/stats");
});
