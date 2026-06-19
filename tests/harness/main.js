import manifest from "../fixtures/manifest.synthetic.json";

const viewState = {
  width: 1024,
  height: 768,
  center: [1024, 1024],
  zoom: 1
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeVisibleTiles(tileManifest, view) {
  const resolution = tileManifest.resolutions[view.zoom];
  const tileSpan = tileManifest.tileSize * resolution;
  const [originX, originY] = tileManifest.origin;
  const [extentMinX, extentMinY, extentMaxX, extentMaxY] = tileManifest.extent;

  const viewWidthUnits = view.width * resolution;
  const viewHeightUnits = view.height * resolution;
  const viewMinX = view.center[0] - viewWidthUnits / 2;
  const viewMinY = view.center[1] - viewHeightUnits / 2;
  const viewMaxX = view.center[0] + viewWidthUnits / 2;
  const viewMaxY = view.center[1] + viewHeightUnits / 2;

  const minTileX = Math.floor((viewMinX - originX) / tileSpan);
  const maxTileX = Math.floor((viewMaxX - originX - 1) / tileSpan);
  const minTileY = Math.floor((viewMinY - originY) / tileSpan);
  const maxTileY = Math.floor((viewMaxY - originY - 1) / tileSpan);

  const extentTileMinX = Math.floor((extentMinX - originX) / tileSpan);
  const extentTileMaxX = Math.floor((extentMaxX - originX - 1) / tileSpan);
  const extentTileMinY = Math.floor((extentMinY - originY) / tileSpan);
  const extentTileMaxY = Math.floor((extentMaxY - originY - 1) / tileSpan);

  const clampedMinX = clamp(minTileX, extentTileMinX, extentTileMaxX);
  const clampedMaxX = clamp(maxTileX, extentTileMinX, extentTileMaxX);
  const clampedMinY = clamp(minTileY, extentTileMinY, extentTileMaxY);
  const clampedMaxY = clamp(maxTileY, extentTileMinY, extentTileMaxY);

  const tiles = [];
  for (let y = clampedMinY; y <= clampedMaxY; y += 1) {
    for (let x = clampedMinX; x <= clampedMaxX; x += 1) {
      const tileMinX = originX + x * tileSpan;
      const tileMinY = originY + y * tileSpan;
      const pixelX = Math.round((tileMinX - viewMinX) / resolution);
      const pixelY = Math.round((tileMinY - viewMinY) / resolution);

      tiles.push({
        z: view.zoom,
        x,
        y,
        pixelX,
        pixelY
      });
    }
  }

  return tiles;
}

function formatUrl(template, tile) {
  return template
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}

function renderHarness(target, tileManifest, view) {
  const viewport = document.createElement("div");
  viewport.className = "tile-viewport";
  viewport.style.width = `${view.width}px`;
  viewport.style.height = `${view.height}px`;

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-title">Synthetic Tile Harness</div>
    <div class="overlay-row"><span>Zoom</span><span>${view.zoom}</span></div>
    <div class="overlay-row" data-testid="cursor-readout"><span>Cursor</span><span>Lat 40.000 · Lon -105.000</span></div>
    <div class="overlay-row" data-testid="north-up"><span>North-up</span><span>0°</span></div>
    <div class="overlay-row"><span>Scale</span><span data-testid="scale-label">1:250k</span></div>
    <div class="scale-bar" data-testid="scale-bar"></div>
  `;

  const tiles = computeVisibleTiles(tileManifest, view);
  const imageLoadTargets = [];

  tiles.forEach((tile) => {
    const image = document.createElement("img");
    image.className = "tile-image";
    image.dataset.testid = "tile";
    image.dataset.z = String(tile.z);
    image.dataset.x = String(tile.x);
    image.dataset.y = String(tile.y);
    image.src = formatUrl(tileManifest.tileUrlTemplate, tile);
    image.style.transform = `translate(${tile.pixelX}px, ${tile.pixelY}px)`;

    viewport.append(image);
    imageLoadTargets.push(image);
  });

  viewport.append(overlay);
  target.append(viewport);

  let remaining = imageLoadTargets.length;
  const markReady = () => {
    target.dataset.tilesReady = "true";
    window.__testState = {
      view,
      tiles,
      manifest: tileManifest
    };
  };

  if (remaining === 0) {
    markReady();
    return;
  }

  imageLoadTargets.forEach((image) => {
    image.addEventListener("load", () => {
      remaining -= 1;
      if (remaining === 0) {
        markReady();
      }
    });
    image.addEventListener("error", () => {
      remaining -= 1;
      if (remaining === 0) {
        markReady();
      }
    });
  });
}

const root = document.getElementById("harness");
renderHarness(root, manifest, viewState);
