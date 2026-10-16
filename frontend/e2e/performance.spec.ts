import { expect, test } from "@playwright/test";

/**
 * Measures the list at each page size against the real API, so the performance
 * claims in the README are numbers rather than adjectives. Assertions are loose
 * bounds; the useful output is the printed table.
 */
const PAGE_SIZES = [25, 50, 100] as const;

async function patientCount(request: {
  get: (url: string) => Promise<{ json: () => Promise<{ total: number }> }>;
}) {
  const response = await request.get("/api/v1/patients/stats");
  return (await response.json()).total;
}

test.describe("patient list rendering", () => {
  for (const size of PAGE_SIZES) {
    test(`renders ${size} rows`, async ({ page, request }, testInfo) => {
      const total = await patientCount(request);
      test.skip(
        total < size,
        `needs at least ${size} patients - load them with: cd backend && python -m scripts.bulk_seed 5000`,
      );

      const started = Date.now();
      await page.goto(`/patients?page_size=${size}`);
      await expect(page.getByRole("row").nth(size)).toBeVisible();
      const elapsed = Date.now() - started;

      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        return {
          domNodes: document.getElementsByTagName("*").length,
          rows: document.querySelectorAll("tbody tr").length,
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        };
      });

      testInfo.annotations.push({
        type: "measurement",
        description: `size=${size} wall=${elapsed}ms rows=${metrics.rows} domNodes=${metrics.domNodes} dcl=${metrics.domContentLoaded}ms`,
      });
      console.log(
        `  page_size=${String(size).padEnd(3)} wall=${String(elapsed).padStart(4)}ms  rows=${metrics.rows}  domNodes=${metrics.domNodes}`,
      );

      expect(metrics.rows).toBe(size);
      expect(elapsed).toBeLessThan(5000);
    });
  }

  test("typing stays responsive while a request is in flight", async ({ page, request }) => {
    const total = await patientCount(request);
    test.skip(total < 100, "needs at least 100 patients - see scripts/bulk_seed.py");

    await page.goto("/patients?page_size=100");
    await expect(page.getByRole("row").nth(100)).toBeVisible();

    const search = page.getByLabel("Search patients");
    const started = Date.now();
    await search.pressSequentially("delgado", { delay: 0 });
    const typingTime = Date.now() - started;

    // The field must not wait on the network: debounced input plus a cached
    // previous page keeps keystrokes off the request path.
    console.log(`  typing 7 characters took ${typingTime}ms`);
    await expect(search).toHaveValue("delgado");
    expect(typingTime).toBeLessThan(1500);
  });
});
