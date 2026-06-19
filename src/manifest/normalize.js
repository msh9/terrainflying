/**
 * Normalizes supported manifest input shapes into the canonical
 * web-tilelayer schemaVersion 3.0 structure.
 */

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeAttribution(value) {
  const direct = asNonEmptyString(value);
  if (direct) {
    return direct;
  }
  if (isObject(value)) {
    return asNonEmptyString(value.text);
  }
  return null;
}

function normalizeExtent(value) {
  if (!isObject(value) || !Array.isArray(value.crsUnits)) {
    return undefined;
  }
  return {
    crsUnits: [...value.crsUnits]
  };
}

function normalizeResolutions(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((resolution) => Number.isFinite(resolution));
}

function deriveDefaultResolution(resolutions) {
  if (!Array.isArray(resolutions) || resolutions.length === 0) {
    return null;
  }
  return resolutions[Math.floor(resolutions.length / 2)];
}

function normalizeCrs(crs) {
  if (!isObject(crs)) {
    return {};
  }
  const value = asNonEmptyString(crs.value) || asNonEmptyString(crs.wgs84Transform);
  if (!value) {
    return {};
  }
  const normalized = { value };
  if ("wgs84Transform" in crs) {
    normalized.wgs84Transform = asNonEmptyString(crs.wgs84Transform);
  }
  return normalized;
}

function normalizeTile(tile, fallbackTile) {
  const tileInput = isObject(tile) ? tile : isObject(fallbackTile) ? fallbackTile : null;
  if (!tileInput) {
    return undefined;
  }

  const normalized = {
    scheme: asNonEmptyString(tileInput.scheme) || "custom-zxy",
    tileSizePx: tileInput.tileSizePx,
    format: tileInput.format,
    origin: Array.isArray(tileInput.origin) ? [...tileInput.origin] : tileInput.origin,
    resolutions: normalizeResolutions(tileInput.resolutions)
  };

  const minResolution =
    Number.isFinite(tileInput.minResolution) && tileInput.minResolution >= 0
      ? tileInput.minResolution
      : normalized.resolutions.length > 0
        ? Math.min(...normalized.resolutions)
        : undefined;
  if (minResolution !== undefined) {
    normalized.minResolution = minResolution;
  }

  const maxResolution =
    Number.isFinite(tileInput.maxResolution) && tileInput.maxResolution >= 0
      ? tileInput.maxResolution
      : normalized.resolutions.length > 0
        ? Math.max(...normalized.resolutions)
        : undefined;
  if (maxResolution !== undefined) {
    normalized.maxResolution = maxResolution;
  }

  if (asNonEmptyString(tileInput.archiveUrl)) {
    normalized.archiveUrl = tileInput.archiveUrl;
  }
  if (Number.isInteger(tileInput.archiveZoomOffset)) {
    normalized.archiveZoomOffset = tileInput.archiveZoomOffset;
  }
  if (Number.isInteger(tileInput.archiveMinZoom)) {
    normalized.archiveMinZoom = tileInput.archiveMinZoom;
  }
  if (Number.isInteger(tileInput.archiveMaxZoom)) {
    normalized.archiveMaxZoom = tileInput.archiveMaxZoom;
  }
  if (isObject(tileInput.archiveZoomByLocalZoom)) {
    normalized.archiveZoomByLocalZoom = { ...tileInput.archiveZoomByLocalZoom };
  }
  if (asNonEmptyString(tileInput.vectorLayerKind)) {
    normalized.vectorLayerKind = tileInput.vectorLayerKind;
  }
  if (asNonEmptyString(tileInput.rasterStyle)) {
    normalized.rasterStyle = tileInput.rasterStyle;
  }

  const explicitTemplate = asNonEmptyString(tileInput.urlTemplate);
  if (explicitTemplate) {
    normalized.urlTemplate = explicitTemplate;
  } else if (
    normalized.scheme === "custom-zxy" &&
    (normalized.format === "webp" || normalized.format === "avif" || normalized.format === "png")
  ) {
    normalized.urlTemplate = `tiles/{z}/{x}/{y}.${normalized.format}`;
  }

  return normalized;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeRelease(value) {
  if (!isObject(value)) {
    return undefined;
  }
  const result = {};
  if (typeof value.effectiveDate === "string" && DATE_PATTERN.test(value.effectiveDate)) {
    result.effectiveDate = value.effectiveDate;
  }
  if (typeof value.dataCutDate === "string" && DATE_PATTERN.test(value.dataCutDate)) {
    result.dataCutDate = value.dataCutDate;
  }
  if (
    isObject(value.dataWindow) &&
    typeof value.dataWindow.start === "string" &&
    DATE_PATTERN.test(value.dataWindow.start) &&
    typeof value.dataWindow.end === "string" &&
    DATE_PATTERN.test(value.dataWindow.end)
  ) {
    result.dataWindow = { start: value.dataWindow.start, end: value.dataWindow.end };
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeLayer(layer, index, shared) {
  const layerInput = isObject(layer) ? layer : {};

  const normalized = {
    id: asNonEmptyString(layerInput.id) || `layer-${index + 1}`,
    name: asNonEmptyString(layerInput.name) || `Layer ${index + 1}`,
    zIndex: Number.isInteger(layerInput.zIndex) ? layerInput.zIndex : index,
    extent: normalizeExtent(layerInput.extent) || normalizeExtent(shared.extent),
    tile: normalizeTile(layerInput.tile, shared.tile),
    attribution:
      normalizeAttribution(layerInput.attribution) ||
      normalizeAttribution(shared.attribution) ||
      "Unknown"
  };

  if (typeof layerInput.optional === "boolean") {
    normalized.optional = layerInput.optional;
  }
  if (typeof layerInput.defaultVisible === "boolean") {
    normalized.defaultVisible = layerInput.defaultVisible;
  }
  if (asNonEmptyString(layerInput.uiLabel)) {
    normalized.uiLabel = layerInput.uiLabel;
  }
  if (asNonEmptyString(layerInput.groupId)) {
    normalized.groupId = layerInput.groupId;
  }
  if (asNonEmptyString(layerInput.groupLabel)) {
    normalized.groupLabel = layerInput.groupLabel;
  }
  if (isObject(layerInput.release)) {
    const rel = normalizeRelease(layerInput.release);
    if (rel) {
      normalized.release = rel;
    }
  } else if (asNonEmptyString(layerInput.effectiveDate)) {
    normalized.release = { effectiveDate: layerInput.effectiveDate };
  }

  return normalized;
}

function normalizeLayers(manifest, shared) {
  if (Array.isArray(manifest.layers) && manifest.layers.length > 0) {
    return manifest.layers.map((layer, index) => normalizeLayer(layer, index, shared));
  }

  const hasRasterLayout = isObject(manifest.tile);
  if (!hasRasterLayout) {
    return [];
  }

  return [
    normalizeLayer(
      {
        id: "base",
        name: "Mosaic",
        zIndex: 0,
        extent: manifest.extent,
        tile: manifest.tile,
        attribution: manifest.attribution
      },
      0,
      shared
    )
  ];
}

export function normalizeManifest(manifest) {
  if (!isObject(manifest)) {
    return manifest;
  }

  const shared = {
    extent: manifest.extent,
    tile: manifest.tile,
    attribution: manifest.attribution
  };
  const layers = normalizeLayers(manifest, shared);
  const fallbackResolutions = normalizeResolutions(manifest.tile?.resolutions);
  const viewResolutions = normalizeResolutions(manifest.view?.resolutions ?? fallbackResolutions);
  const defaultResolution = Number.isFinite(manifest.view?.defaultResolution)
    ? manifest.view.defaultResolution
    : deriveDefaultResolution(viewResolutions);

  return {
    schemaVersion: "3.0",
    crs: normalizeCrs(manifest.crs),
    extent: normalizeExtent(manifest.extent),
    view: {
      resolutions: viewResolutions,
      defaultResolution
    },
    layers
  };
}
