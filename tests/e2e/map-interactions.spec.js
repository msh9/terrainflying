import { expect, test } from "@playwright/test";

const TILE_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="#dfe7f5" />
  <circle cx="256" cy="256" r="120" fill="#8da4c8" />
</svg>`;

test.beforeEach(async ({ page }) => {
  await page.route("**/fixtures/tiles/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: TILE_BODY
    })
  );

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

async function getMapState(page) {
  return page.evaluate(() => window.__getMapState());
}

async function waitForStableResolution(page, previousResolution) {
  await page.waitForFunction((prior) => {
    const state = window.__getMapState();
    if (!state?.resolutions?.length) {
      return false;
    }
    return state.resolution !== prior && state.resolutions.includes(state.resolution);
  }, previousResolution);
}

test("pan: dragging updates the map center", async ({ page }) => {
  await page.goto("/map-harness.html");
  await page.locator("body[data-map-ready='true']").waitFor();

  const mapLocator = page.locator("[data-role='map']");
  await expect(mapLocator).toBeVisible();

  const initial = await getMapState(page);
  const box = await mapLocator.boundingBox();
  if (!box) {
    throw new Error("Map bounding box unavailable.");
  }

  const startX = box.x + box.width * 0.5;
  const startY = box.y + box.height * 0.5;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 200, startY + 80, { steps: 12 });
  await page.mouse.up();

  await page.waitForFunction((center) => {
    const next = window.__getMapState();
    return next.center[0] !== center[0] || next.center[1] !== center[1];
  }, initial.center);

  const moved = await getMapState(page);
  expect(moved.center).not.toEqual(initial.center);
  expect(moved.center[0]).toBeGreaterThanOrEqual(moved.extent[0]);
  expect(moved.center[0]).toBeLessThanOrEqual(moved.extent[2]);
  expect(moved.center[1]).toBeGreaterThanOrEqual(moved.extent[1]);
  expect(moved.center[1]).toBeLessThanOrEqual(moved.extent[3]);
});

test("zoom: wheel updates resolution and clamps", async ({ page }) => {
  await page.goto("/map-harness.html");
  await page.locator("body[data-map-ready='true']").waitFor();

  const mapLocator = page.locator("[data-role='map']");
  await expect(mapLocator).toBeVisible();

  const initial = await getMapState(page);

  await mapLocator.hover();
  await page.mouse.wheel(0, -400);

  await waitForStableResolution(page, initial.resolution);

  const zoomedIn = await getMapState(page);
  expect(zoomedIn.resolution).toBeLessThan(initial.resolution);
  expect(zoomedIn.zoom).toBeGreaterThanOrEqual(zoomedIn.minZoom);
  expect(zoomedIn.zoom).toBeLessThanOrEqual(zoomedIn.maxZoom);

  await page.mouse.wheel(0, 400);
  await waitForStableResolution(page, zoomedIn.resolution);

  const zoomedOut = await getMapState(page);
  expect(zoomedOut.resolution).toBeGreaterThan(zoomedIn.resolution);
  expect(zoomedOut.zoom).toBeGreaterThanOrEqual(zoomedOut.minZoom);
  expect(zoomedOut.zoom).toBeLessThanOrEqual(zoomedOut.maxZoom);
});

test("zoom: can reach the coarsest resolution", async ({ page }) => {
  await page.goto("/map-harness.html");
  await page.locator("body[data-map-ready='true']").waitFor();

  const mapLocator = page.locator("[data-role='map']");
  await expect(mapLocator).toBeVisible();

  const initial = await getMapState(page);
  const maxResolution = Math.max(...initial.resolutions);
  let currentResolution = initial.resolution;

  for (let i = 0; i < 6 && currentResolution !== maxResolution; i += 1) {
    await mapLocator.hover();
    await page.mouse.wheel(0, 400);
    await waitForStableResolution(page, currentResolution);
    const next = await getMapState(page);
    currentResolution = next.resolution;
  }

  expect(currentResolution).toBe(maxResolution);
});

test("rotation: buttons adjust the view rotation", async ({ page }) => {
  await page.goto("/map-harness.html");
  await page.locator("body[data-map-ready='true']").waitFor();

  const rotateMinus = page.locator("[data-role='rotation-minus']");
  const rotatePlus = page.locator("[data-role='rotation-plus']");
  const rotateReset = page.locator("[data-role='rotation-reset']");
  const readout = page.locator("[data-role='north-value']");

  await expect(rotateMinus).toBeVisible();
  await expect(rotatePlus).toBeVisible();
  await expect(rotateReset).toBeVisible();
  await expect(readout).toHaveText("0.0 deg");

  await rotatePlus.click();
  await expect(readout).toHaveText("3.0 deg");

  await rotateMinus.click();
  await expect(readout).toHaveText("0.0 deg");

  await rotateMinus.click();
  await expect(readout).toHaveText("-3.0 deg");

  await rotateReset.click();
  await expect(readout).toHaveText("0.0 deg");
});

test.describe("layer panel: mobile viewport accessibility", () => {
  const MOBILE_HEIGHT = 844;
  const MOBILE_WIDTH = 390;

  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT }
  });

  async function gotoApp(page) {
    await page.goto("/?manifestUrl=/tests/fixtures/manifest.multilayer.json");
    await page.locator("[data-role='layer-panel-toggle']").waitFor({ state: "visible" });
  }

  test("trigger button is within the visible viewport on load", async ({ page }) => {
    await gotoApp(page);

    const trigger = page.locator("[data-role='layer-panel-toggle']");
    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y + box.height).toBeLessThanOrEqual(MOBILE_HEIGHT);
    expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_WIDTH);
  });

  test("panel is within the visible viewport when opened", async ({ page }) => {
    await gotoApp(page);

    const trigger = page.locator("[data-role='layer-panel-toggle']");
    await trigger.tap();

    const panel = page.locator("#layer-panel-content");
    await expect(panel).toHaveAttribute("data-open", "true");

    // Poll until animation settles (180ms CSS transition) before checking position.
    await expect
      .poll(
        async () => {
          const box = await panel.boundingBox();
          return box ? box.y + box.height : Infinity;
        },
        { timeout: 2000 }
      )
      .toBeLessThanOrEqual(MOBILE_HEIGHT);

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y).toBeGreaterThanOrEqual(0);
  });
});

test("rotation: auto rotate disables manual controls", async ({ page }) => {
  await page.goto("/map-harness.html");
  await page.locator("body[data-map-ready='true']").waitFor();

  const autoToggle = page.locator("[data-role='rotation-auto']");
  const rotateMinus = page.locator("[data-role='rotation-minus']");
  const rotatePlus = page.locator("[data-role='rotation-plus']");
  const rotateReset = page.locator("[data-role='rotation-reset']");

  await expect(autoToggle).toBeVisible();
  await expect(rotateMinus).toBeEnabled();
  await expect(rotatePlus).toBeEnabled();
  await expect(rotateReset).toBeEnabled();

  await autoToggle.check();
  await expect(rotateMinus).toBeDisabled();
  await expect(rotatePlus).toBeDisabled();
  await expect(rotateReset).toBeDisabled();

  await autoToggle.uncheck();
  await expect(rotateMinus).toBeEnabled();
  await expect(rotatePlus).toBeEnabled();
  await expect(rotateReset).toBeEnabled();
});
