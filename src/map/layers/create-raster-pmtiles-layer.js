import WebGLTile from "ol/layer/WebGLTile";
import DataTile from "ol/source/DataTile";
import TileGrid from "ol/tilegrid/TileGrid";
import { PMTiles } from "pmtiles";
import { resolveAssetUrl } from "../../manifest/index.js";
import { buildLayerAttribution } from "../../manifest/release-attribution.js";
import { isLayerVisible } from "./visibility";
import { getLayerTileGridConfig } from "../../manifest/layer-tile-config.js";
import { createArchiveZoomResolver } from "./pmtiles-zoom-resolver";
import { createSlopeShadingStyle } from "./slope-shading-style.js";

function getTileMimeType(format) {
  if (format === "avif") {
    return "image/avif";
  }
  if (format === "webp") {
    return "image/webp";
  }
  if (format === "png") {
    return "image/png";
  }
  throw new Error(`Unsupported tile format: ${format}`);
}

function createTransparentTileData(tileSizePx) {
  return new Uint8Array(tileSizePx * tileSizePx * 4);
}

export async function loadRasterPmtilesTile({
  archive,
  archiveZoom,
  x,
  y,
  signal,
  tileSizePx,
  mimeType,
  createImageBitmapFn = globalThis.createImageBitmap,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  revokeObjectUrl = (url) => URL.revokeObjectURL(url),
  createImage = () => new Image(),
  createTransparent = createTransparentTileData
}) {
  const response = await archive.getZxy(archiveZoom, x, y, signal);
  if (!response) {
    return createTransparent(tileSizePx);
  }

  const blob = new Blob([response.data], { type: mimeType });
  if (typeof createImageBitmapFn === "function") {
    return createImageBitmapFn(blob);
  }

  const imageUrl = createObjectUrl(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const tileImage = createImage();
      tileImage.addEventListener("load", () => resolve(tileImage), {
        once: true
      });
      tileImage.addEventListener(
        "error",
        () => reject(new Error("Failed to decode PMTiles raster tile.")),
        { once: true }
      );
      tileImage.src = imageUrl;
    });
    return image;
  } finally {
    revokeObjectUrl(imageUrl);
  }
}

export function createRasterPmtilesLoader({
  archive,
  zoomResolverPromise,
  tile,
  mimeType,
  createImageBitmapFn = globalThis.createImageBitmap,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  revokeObjectUrl = (url) => URL.revokeObjectURL(url),
  createImage = () => new Image(),
  createTransparent = createTransparentTileData
}) {
  return async (z, x, y, loaderOptions) => {
    const resolveZoom = await zoomResolverPromise;
    const archiveZoom = resolveZoom(z);
    return loadRasterPmtilesTile({
      archive,
      archiveZoom,
      x,
      y,
      signal: loaderOptions?.signal,
      tileSizePx: tile.tileSizePx,
      mimeType,
      createImageBitmapFn,
      createObjectUrl,
      revokeObjectUrl,
      createImage,
      createTransparent
    });
  };
}

export function createRasterPmtilesLayer({
  layer,
  projection,
  manifestUrl,
  layerVisibility,
  archiveFactory = (archiveUrl) => new PMTiles(archiveUrl),
  createImageBitmapFn = globalThis.createImageBitmap,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  revokeObjectUrl = (url) => URL.revokeObjectURL(url),
  createImage = () => new Image()
}) {
  const { tile } = layer;
  const tileGrid = new TileGrid(getLayerTileGridConfig(layer));

  const archiveUrl = resolveAssetUrl(tile.archiveUrl, manifestUrl);
  const archive = archiveFactory(archiveUrl);
  const mimeType = getTileMimeType(tile.format);
  const metadataPromise = archive.getMetadata().catch(() => ({}));
  const zoomResolverPromise = metadataPromise.then((metadata) =>
    createArchiveZoomResolver(tile, metadata)
  );

  const source = new DataTile({
    projection,
    tileGrid,
    tileSize: tile.tileSizePx,
    attributions: buildLayerAttribution(layer),
    loader: createRasterPmtilesLoader({
      archive,
      zoomResolverPromise,
      tile,
      mimeType,
      createImageBitmapFn,
      createObjectUrl,
      revokeObjectUrl,
      createImage
    })
  });

  const layerOptions = {
    source,
    extent: layer.extent.crsUnits,
    maxResolution: tile.maxResolution,
    minResolution: tile.minResolution,
    zIndex: layer.zIndex,
    visible: isLayerVisible(layer, layerVisibility)
  };

  if (tile.rasterStyle === "slope-shading") {
    layerOptions.style = createSlopeShadingStyle();
  }

  return new WebGLTile(layerOptions);
}
