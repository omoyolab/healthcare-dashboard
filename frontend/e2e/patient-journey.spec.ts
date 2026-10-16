import { expect, test } from "@playwright/test";

/**
 * The main journey, against the real API and database: create, read, annotate,
 * edit, delete. Each run uses a unique email so repeated runs do not collide,
 * and cleans up after itself.
 */
function uniquePatient() {
  // Per test, not per module: projects run in parallel against one database, so
  // a module-level timestamp can collide and trip the unique-email constraint.
  const id = crypto.randomUUID().slice(0, 8);
  return {
    first: "Testpatient",
    last: `Journey${id}`,
    dob: "1988-04-12",
    email: `journey.${id}@example.com`,
  };
}

test("create, annotate, edit and delete a patient", async ({ page }) => {
  const patient = uniquePatient();
  await page.goto("/patients/new");

  await page.getByLabel("First name").fill(patient.first);
  await page.getByLabel("Last name").fill(patient.last);
  await page.getByLabel("Date of birth").fill(patient.dob);
  await page.getByLabel(/Email/).fill(patient.email);
  await page.getByLabel("Allergies").fill("latex, penicillin");
  await page.getByRole("button", { name: "Create patient" }).click();

  // Lands on the detail page for the new patient.
  await expect(
    page.getByRole("heading", { name: `${patient.first} ${patient.last}` }),
  ).toBeVisible();
  // exact: once the summary loads it also mentions latex in the narrative.
  await expect(page.getByText("latex", { exact: true })).toBeVisible();

  // The summary exists before any notes, and says so.
  await expect(page.getByText(/No clinical notes are on file yet/)).toBeVisible();

  // Adding a note updates the generated narrative, not just the list.
  await page.getByLabel("Add a clinical note").fill("Initial consultation completed.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Initial consultation completed.").first()).toBeVisible();
  await expect(page.getByText(/A single clinical note from/)).toBeVisible();

  // Edit: status change is reflected on the detail page.
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Status").selectOption("inactive");
  await page.getByRole("button", { name: "Save changes" }).click();
  // Scoped to the detail header: the edit form's <option>Inactive</option> is
  // still in the DOM while the route transitions.
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]+$/);
  const header = page
    .getByRole("heading", { name: `${patient.first} ${patient.last}` })
    .locator("..");
  await expect(header.getByText("Inactive", { exact: true })).toBeVisible();

  // Search finds it in the list.
  await page.goto("/patients");
  await page.getByLabel("Search patients").fill(patient.last);
  await expect(page.getByRole("link", { name: `${patient.last}, ${patient.first}` })).toBeVisible();

  // Delete, through the confirmation dialog.
  await page.getByRole("link", { name: `${patient.last}, ${patient.first}` }).click();
  // exact: the note row also has a "Delete note from ..." button.
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete patient" }).click();

  await expect(page).toHaveURL(/\/patients$/);
  await page.getByLabel("Search patients").fill(patient.last);
  await expect(page.getByText("No patients match those filters")).toBeVisible();
});

test("list state survives a reload and is shareable", async ({ page }) => {
  await page.goto("/patients");

  await page.getByLabel("Search patients").fill("ro");
  await page.getByRole("button", { name: "Active", exact: true }).click();
  await expect(page).toHaveURL(/q=ro/);
  await expect(page).toHaveURL(/status=active/);

  const url = page.url();
  await page.reload();

  await expect(page.getByLabel("Search patients")).toHaveValue("ro");
  await expect(page.getByRole("button", { name: "Active", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(page.url()).toBe(url);
});

test("an unknown route shows the 404 page", async ({ page }) => {
  await page.goto("/nope");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
