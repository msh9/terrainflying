/**
 * Builds an OpenLayers attribution string for a layer, appending
 * release date metadata when present.
 */

export function buildLayerAttribution(layer) {
  const base = layer.attribution;
  const release = layer.release;
  if (!release) {
    return base;
  }

  if (release.effectiveDate) {
    return `${base} · eff. ${release.effectiveDate}`;
  }
  if (release.dataWindow) {
    return `${base} · ${release.dataWindow.start} to ${release.dataWindow.end}`;
  }
  if (release.dataCutDate) {
    return `${base} · data through ${release.dataCutDate}`;
  }
  return base;
}
