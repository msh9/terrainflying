import { isLayerOptional, isLayerVisible } from "../../map/layers/visibility";

export function getLayerUiLabel(layer) {
  if (!layer) {
    return "Layer";
  }
  return layer.uiLabel || layer.name || layer.id || "Layer";
}

export function getOptionalLayers(layers) {
  return (layers ?? []).filter((layer) => isLayerOptional(layer));
}

/**
 * Returns display items for the layer panel — one item per visible toggle.
 * Grouped layers (sharing a groupId) are collapsed into a single group item.
 *
 * @returns Array of { type: 'layer', layer } | { type: 'group', groupId, groupLabel, memberIds }
 */
export function getDisplayItems(layers) {
  const optionalLayers = getOptionalLayers(layers ?? []);
  const items = [];
  const seenGroupIds = new Map();

  for (const layer of optionalLayers) {
    if (layer.groupId) {
      if (seenGroupIds.has(layer.groupId)) {
        seenGroupIds.get(layer.groupId).memberIds.push(layer.id);
      } else {
        const groupItem = {
          type: "group",
          groupId: layer.groupId,
          groupLabel: layer.groupLabel || layer.groupId,
          memberIds: [layer.id]
        };
        seenGroupIds.set(layer.groupId, groupItem);
        items.push(groupItem);
      }
    } else {
      items.push({ type: "layer", layer });
    }
  }

  return items;
}

export function isGroupVisible(memberIds, layerVisibility) {
  return (memberIds ?? []).some((id) => {
    const fakeLayer = { id, optional: true };
    return isLayerVisible(fakeLayer, layerVisibility);
  });
}
