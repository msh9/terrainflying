function normalizeZoomMap(value) {
  if (!value || typeof value !== "object") {
    return {};
  }
  const mapping = {};
  Object.entries(value).forEach(([key, mappedZoom]) => {
    const localZoom = Number(key);
    if (!Number.isInteger(localZoom) || !Number.isInteger(mappedZoom)) {
      return;
    }
    mapping[localZoom] = mappedZoom;
  });
  return mapping;
}

function resolveArchiveZoomOffset(tile, metadata, options) {
  if (Number.isInteger(tile?.archiveZoomOffset)) {
    return tile.archiveZoomOffset;
  }
  if (Number.isInteger(metadata?.pmtilesZoomOffset)) {
    return metadata.pmtilesZoomOffset;
  }
  return options.defaultOffset ?? 0;
}

export function createArchiveZoomResolver(tile, metadata, options = {}) {
  const tileMap = normalizeZoomMap(tile?.archiveZoomByLocalZoom);
  const metadataMap = normalizeZoomMap(metadata?.localZoomToPmtilesZoom);
  const zoomMap = { ...metadataMap, ...tileMap };
  const zoomOffset = resolveArchiveZoomOffset(tile, metadata, options);
  const archiveMinZoom = Number.isInteger(tile?.archiveMinZoom) ? tile.archiveMinZoom : null;
  const archiveMaxZoom = Number.isInteger(tile?.archiveMaxZoom) ? tile.archiveMaxZoom : null;

  return (localZoom) => {
    let archiveZoom;
    if (Number.isInteger(zoomMap[localZoom])) {
      archiveZoom = zoomMap[localZoom];
    } else {
      archiveZoom = localZoom + zoomOffset;
    }
    if (archiveMinZoom !== null) {
      archiveZoom = Math.max(archiveZoom, archiveMinZoom);
    }
    if (archiveMaxZoom !== null) {
      archiveZoom = Math.min(archiveZoom, archiveMaxZoom);
    }
    return archiveZoom;
  };
}
