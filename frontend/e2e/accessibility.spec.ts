import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/patients", "/patients/new"];

for (const route of ROUTES) {
  test(`${route} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    // Wait for data so the scan covers rendered content, not skeletons.
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test("the patient list is usable with the keyboard alone", async ({ page }) => {
  await page.goto("/patients");
  await page.waitForLoadState("networkidle");

  // Tab until the search box has focus, then type without touching the mouse.
  await page.keyboard.press("Tab");
  for (let i = 0; i < 12; i += 1) {
    const focused = await page.evaluate(() => document.activeElement?.id ?? "");
    if (focused === "patient-search") break;
    await page.keyboard.press("Tab");
  }
  await expect(page.locator("#patient-search")).toBeFocused();

  await page.keyboard.type("delgado");
  await expect(page.getByRole("link", { name: /Delgado/ })).toBeVisible();
});
