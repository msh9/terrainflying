/**
 * Reads and validates manifest layer tile metadata that drives tile-grid
 * construction and PMTiles vector-grid selection.
 */

export function getLayerTileGridConfig(layer) {
  const extent = layer?.extent?.crsUnits;
  const tile = layer?.tile;
  if (!Array.isArray(extent) || extent.length !== 4) {
    throw new Error("Layer extent is required.");
  }
  if (!tile) {
    throw new Error("Layer tile metadata is required.");
  }
  if (!Array.isArray(tile.origin) || tile.origin.length !== 2) {
    throw new Error("Layer tile origin is required.");
  }
  if (!Array.isArray(tile.resolutions) || tile.resolutions.length === 0) {
    throw new Error("Layer tile resolutions are required.");
  }
  if (!Number.isFinite(tile.tileSizePx) || tile.tileSizePx <= 0) {
    throw new Error("Layer tile size must be a positive number.");
  }
  return {
    extent: [...extent],
    origin: [...tile.origin],
    resolutions: [...tile.resolutions],
    tileSize: tile.tileSizePx
  };
}

function hasArchiveZoomMapping(mapping) {
  if (!mapping || typeof mapping !== "object") {
    return false;
  }
  return Object.entries(mapping).some(([localZoom, archiveZoom]) => {
    return Number.isInteger(Number(localZoom)) && Number.isInteger(archiveZoom);
  });
}

export function shouldUseManifestVectorTileGrid(tile) {
  if (!tile || tile.scheme !== "pmtiles" || tile.format !== "mvt") {
    return false;
  }
  return (
    Number.isInteger(tile.archiveZoomOffset) || hasArchiveZoomMapping(tile.archiveZoomByLocalZoom)
  );
}
