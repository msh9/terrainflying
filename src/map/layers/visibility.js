export function isLayerOptional(layer) {
  return Boolean(layer?.optional);
}

export function getLayerDefaultVisible(layer) {
  if (!layer) {
    return false;
  }
  if (!isLayerOptional(layer)) {
    return true;
  }
  if (typeof layer.defaultVisible === "boolean") {
    return layer.defaultVisible;
  }
  return false;
}

export function buildLayerVisibility(layers) {
  const visibility = {};
  (layers ?? []).forEach((layer) => {
    if (!layer?.id) {
      return;
    }
    visibility[layer.id] = getLayerDefaultVisible(layer);
  });
  return visibility;
}

export function isLayerVisible(layer, visibility) {
  if (!layer) {
    return false;
  }
  if (!visibility || !(layer.id in visibility)) {
    return getLayerDefaultVisible(layer);
  }
  return Boolean(visibility[layer.id]);
}
