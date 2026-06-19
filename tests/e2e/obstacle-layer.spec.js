import { expect, test } from "@playwright/test";

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

test("obstacle layer: toggle, click popup, and close on map click", async ({ page }) => {
  await page.goto("/map-harness.html?manifestUrl=/tests/fixtures/manifest.obstacles.json");
  await page.locator("body[data-map-ready='true']").waitFor();

  const obstacleToggle = page.locator("input[data-layer-id='digital-obstacles']");
  await expect(obstacleToggle).toBeVisible();
  await obstacleToggle.check();

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

  const mapLocator = page.locator("[data-role='map']");
  const mapBox = await mapLocator.boundingBox();
  if (!mapBox) {
    throw new Error("Map bounding box unavailable.");
  }
  await page.mouse.click(
    mapBox.x + Math.round(clickPixel[0]),
    mapBox.y + Math.round(clickPixel[1])
  );

  const popup = page.locator("[data-role='obstacle-popup']");
  await expect(popup).toBeVisible();
  await expect(popup).toContainText("Type");
  await expect(popup).toContainText("AGL");
  await expect(popup).toContainText("AMSL");
  await expect(popup).toContainText("Lighting");
  await expect(popup).toContainText("Vertical Accuracy");

  const emptyPixel = await page.evaluate(() => {
    const app = document.querySelector("tile-viewer-app");
    const map = app?.map;
    const layer = app?.layerMap?.get("digital-obstacles");
    const mapElement = app?.querySelector("[data-role='map']");
    if (!map || !layer || !mapElement) {
      return null;
    }
    const size = map.getSize();
    if (!size) {
      return null;
    }
    const mapRect = mapElement.getBoundingClientRect();
    for (let y = 30; y < size[1] - 30; y += 70) {
      for (let x = 30; x < size[0] - 30; x += 70) {
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
          { hitTolerance: 10 }
        );
        if (!hit) {
          return [x, y];
        }
      }
    }
    return null;
  });
  expect(emptyPixel).not.toBeNull();

  const emptyX = Math.round(emptyPixel[0]);
  const emptyY = Math.round(emptyPixel[1]);
  await page.evaluate(
    ([x, y]) => {
      const app = document.querySelector("tile-viewer-app");
      const map = app?.map;
      if (!map) {
        return;
      }
      const coordinate = map.getCoordinateFromPixel([x, y]);
      if (!coordinate) {
        return;
      }
      map.dispatchEvent({
        type: "singleclick",
        pixel: [x, y],
        coordinate,
        dragging: false,
        originalEvent: new MouseEvent("click")
      });
    },
    [emptyX, emptyY]
  );
  await expect(popup).toBeHidden();
});
