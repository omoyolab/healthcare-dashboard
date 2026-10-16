import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Sidebar, isLinkActive, sectionFor } from "@/components/layout/Sidebar";
import { renderWithProviders } from "@/test/render";

function currentLinkNames(): string[] {
  return screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent ?? "");
}

test("shows patient links while in the patients area", () => {
  renderWithProviders(<Sidebar />, { route: "/patients" });

  expect(screen.getByRole("navigation", { name: "Patients" })).toBeInTheDocument();
  expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
    "All patients",
    "Add patient",
  ]);
});

test("shows dashboard links at the root, not patient links", () => {
  renderWithProviders(<Sidebar />, { route: "/" });

  expect(screen.getByRole("navigation", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual(["Overview"]);
});

test("only Add patient is current on the create route", () => {
  // "/patients" is a prefix of "/patients/new", which used to mark both.
  renderWithProviders(<Sidebar />, { route: "/patients/new" });

  expect(currentLinkNames()).toEqual(["Add patient"]);
});

test("All patients stays current on a patient detail page", () => {
  renderWithProviders(<Sidebar />, { route: "/patients/11111111-1111-1111-1111-111111111111" });

  expect(currentLinkNames()).toEqual(["All patients"]);
});

test.each([
  ["/", "Dashboard"],
  ["/patients", "Patients"],
  ["/patients/new", "Patients"],
  ["/patients/abc/edit", "Patients"],
])("sectionFor(%s) is %s", (pathname, title) => {
  expect(sectionFor(pathname).title).toBe(title);
});

test.each([
  ["/", "/", true],
  ["/patients", "/patients", true],
  ["/patients/new", "/patients", false],
  ["/patients/new", "/patients/new", true],
  ["/patients/abc", "/patients", true],
  ["/patients/abc/edit", "/patients", true],
])("isLinkActive(%s, %s) is %s", (pathname, to, expected) => {
  expect(isLinkActive(pathname, to)).toBe(expected);
});
