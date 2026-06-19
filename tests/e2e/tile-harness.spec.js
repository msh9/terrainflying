import { expect, test } from "@playwright/test";

const expectedTiles = [
  { z: 1, x: 0, y: 0, pixelX: 0, pixelY: -128 },
  { z: 1, x: 1, y: 0, pixelX: 512, pixelY: -128 },
  { z: 1, x: 0, y: 1, pixelX: 0, pixelY: 384 },
  { z: 1, x: 1, y: 1, pixelX: 512, pixelY: 384 }
];

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.startsWith("http://127.0.0.1") ||
      url.startsWith("http://localhost") ||
      url.startsWith("data:")
    ) {
      return route.continue();
    }
    return route.abort();
  });
});

test("quantitative: harness renders expected tile set", async ({ page }) => {
  await page.goto("/test-harness.html");
  await page.locator("#harness[data-tiles-ready='true']").waitFor();

  const tiles = await page.evaluate(() => window.__testState.tiles);
  expect(tiles).toEqual(expectedTiles);
});

test("visual @visual: harness matches baseline", async ({ page }) => {
  await page.goto("/test-harness.html");
  await page.locator("#harness[data-tiles-ready='true']").waitFor();

  await expect(page.locator("#harness")).toHaveScreenshot("tile-harness.png", {
    maxDiffPixelRatio: 0.01
  });
});
