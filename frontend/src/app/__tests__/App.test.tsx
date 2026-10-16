import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { App } from "@/app/App";

// This test exists because of a real bug: without a HydrateFallback, a
// lazy-route app renders a blank page on first load and nothing errors.
test("renders the dashboard route, not a blank page", async () => {
  render(<App />);

  expect(await screen.findByRole("heading", { name: "Overview" })).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
});

test("has a skip link and a single main landmark", async () => {
  render(<App />);
  await screen.findByRole("heading", { name: "Overview" });

  expect(screen.getByRole("link", { name: "Skip to content" })).toBeInTheDocument();
  expect(screen.getByRole("main")).toBeInTheDocument();
});
