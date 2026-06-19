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

async function getMeasurementCoordinates(page) {
  return page.evaluate(() => {
    const app = document.querySelector("tile-viewer-app");
    const layers = app?.map?.getLayers?.().getArray?.() ?? [];
    const layer = layers.find((candidate) => candidate.getZIndex?.() === 1000);
    const feature = layer
      ?.getSource?.()
      .getFeatures?.()
      ?.find((candidate) => candidate.getGeometry?.()?.getType?.() === "LineString");
    const geometry = feature?.getGeometry?.();
    return geometry ? geometry.getCoordinates() : [];
  });
}

async function dispatchTouch(session, type, points) {
  await session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map(({ x, y }) => ({ x, y }))
  });
}

test("measure: desktop right-click adds multiple segments and reports totals", async ({ page }) => {
  await page.goto("/map-harness.html");
  await page.locator("body[data-map-ready='true']").waitFor();

  const mapLocator = page.locator("[data-role='map']");
  await expect(mapLocator).toBeVisible();

  const box = await mapLocator.boundingBox();
  if (!box) {
    throw new Error("Map bounding box unavailable.");
  }

  const start = { x: box.width * 0.35, y: box.height * 0.6 };
  const second = { x: box.width * 0.52, y: box.height * 0.48 };
  const third = { x: box.width * 0.66, y: box.height * 0.36 };
  const trailing = { x: box.width * 0.78, y: box.height * 0.3 };

  await mapLocator.click({ button: "right", position: start });
  await page.mouse.move(box.x + second.x, box.y + second.y);

  const firstPreview = await getMeasurementCoordinates(page);
  expect(firstPreview).toHaveLength(2);
  expect(firstPreview[0]).not.toEqual(firstPreview[1]);

  await mapLocator.click({ button: "right", position: second });
  await page.mouse.move(box.x + third.x, box.y + third.y);

  const secondPreview = await getMeasurementCoordinates(page);
  expect(secondPreview).toHaveLength(3);

  await mapLocator.click({ button: "right", position: third });
  await page.mouse.move(box.x + trailing.x, box.y + trailing.y);

  const popup = page.locator("[data-role='measure-popup']");
  await expect(popup).toBeVisible();
  await expect(popup).toContainText("Total");
  await expect(popup).toContainText("Geodesic");
  await expect(popup).toContainText("Spherical");
  await expect(popup).toContainText("km");
  await expect(popup).toContainText("NM");
  await expect(popup).toContainText("Segment 1");
  await expect(popup).toContainText("Segment 2");
});

test("measure: left-click clears measurement and still opens obstacle popups", async ({ page }) => {
  await page.goto("/map-harness.html?manifestUrl=/tests/fixtures/manifest.obstacles.json");
  await page.locator("body[data-map-ready='true']").waitFor();

  const obstacleToggle = page.locator("input[data-layer-id='digital-obstacles']");
  await expect(obstacleToggle).toBeVisible();
  await obstacleToggle.check();

  const mapLocator = page.locator("[data-role='map']");
  await expect(mapLocator).toBeVisible();

  const box = await mapLocator.boundingBox();
  if (!box) {
    throw new Error("Map bounding box unavailable.");
  }

  await mapLocator.click({
    button: "right",
    position: { x: box.width * 0.38, y: box.height * 0.62 }
  });
  await page.mouse.move(box.x + box.width * 0.56, box.y + box.height * 0.48);
  await mapLocator.click({
    button: "right",
    position: { x: box.width * 0.56, y: box.height * 0.48 }
  });

  const measurePopup = page.locator("[data-role='measure-popup']");
  await expect(measurePopup).toBeVisible();

  const clickPixelHandle = await page.waitForFunction(() => {
    const app = document.querySelector("tile-viewer-app");
    const map = app?.map;
    const layer = app?.layerMap?.get("digital-obstacles");
    const mapElement = app?.querySelector("[data-role='map']");
    if (!map || !layer || !layer.getVisible()) {
      return null;
    }
    const size = map.getSize();
    if (!size || !mapElement) {
      return null;
    }
    const mapRect = mapElement.getBoundingClientRect();
    for (let y = 16; y < size[1] - 16; y += 24) {
      for (let x = 16; x < size[0] - 16; x += 24) {
        const absoluteX = mapRect.left + x;
        const absoluteY = mapRect.top + y;
        const targetAtPoint = document.elementFromPoint(absoluteX, absoluteY);
        if (!targetAtPoint || !mapElement.contains(targetAtPoint)) {
          continue;
        }
        let hit = false;
        map.forEachFeatureAtPixel(
          [x, y],
          (_, hitLayer) => {
            if (hitLayer === layer) {
              hit = true;
              return true;
            }
            return undefined;
          },
          { hitTolerance: 0 }
        );
        if (hit) {
          return [x, y];
        }
      }
    }
    return null;
  });

  const clickPixel = await clickPixelHandle.jsonValue();
  expect(clickPixel).not.toBeNull();

  await page.mouse.click(box.x + Math.round(clickPixel[0]), box.y + Math.round(clickPixel[1]));

  await expect(measurePopup).toBeHidden();

  const obstaclePopup = page.locator("[data-role='obstacle-popup']");
  await expect(obstaclePopup).toBeVisible();
  await expect(obstaclePopup).toContainText("Type");
});

test.describe("measure: mobile long-press placement", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 }
  });

  test("long press activates measurement and drag updates the segment", async ({ page }) => {
    test.slow();
    await page.goto("/map-harness.html");
    await page.locator("body[data-map-ready='true']").waitFor();
    const cdpSession = await page.context().newCDPSession(page);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const app = document.querySelector("tile-viewer-app");
          const viewport = app?.map?.getViewport?.();
          return viewport ? getComputedStyle(viewport).touchAction : null;
        })
      )
      .toBe("none");

    const mapLocator = page.locator("[data-role='map']");
    await expect(mapLocator).toBeVisible();

    const box = await mapLocator.boundingBox();
    if (!box) {
      throw new Error("Map bounding box unavailable.");
    }

    const startX = box.x + box.width * 0.42;
    const startY = box.y + box.height * 0.58;
    const endX = box.x + box.width * 0.7;
    const endY = box.y + box.height * 0.38;

    await dispatchTouch(cdpSession, "touchStart", [{ x: startX, y: startY }]);

    const holdIndicator = page.locator("[data-role='measure-hold-indicator']");
    await expect(holdIndicator).toBeVisible({ timeout: 1000 });
    await expect(holdIndicator).toBeHidden({ timeout: 2000 });

    await dispatchTouch(cdpSession, "touchMove", [
      { x: (startX + endX) / 2, y: (startY + endY) / 2 }
    ]);
    await dispatchTouch(cdpSession, "touchMove", [{ x: endX, y: endY }]);

    const preview = await getMeasurementCoordinates(page);
    expect(preview).toHaveLength(2);
    expect(preview[0]).not.toEqual(preview[1]);

    await dispatchTouch(cdpSession, "touchEnd", []);

    const popup = page.locator("[data-role='measure-popup']");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("Geodesic");
    await expect(popup).toContainText("Spherical");
    await expect(popup).toContainText("Segment 1");
    await expect(popup).toContainText("NM");
  });
});
