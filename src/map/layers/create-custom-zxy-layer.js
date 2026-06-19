import TileLayer from "ol/layer/Tile";
import { ImageTile } from "ol/source";
import TileGrid from "ol/tilegrid/TileGrid";
import { resolveTileUrlTemplate } from "../../manifest/index.js";
import { buildLayerAttribution } from "../../manifest/release-attribution.js";
import { isLayerVisible } from "./visibility";
import { getLayerTileGridConfig } from "../../manifest/layer-tile-config.js";

export function createCustomZxyLayer({ layer, projection, manifestUrl, layerVisibility }) {
  const tileGrid = new TileGrid(getLayerTileGridConfig(layer));
  const tileUrlTemplate = resolveTileUrlTemplate(layer.tile.urlTemplate, manifestUrl);
  const source = new ImageTile({
    projection,
    tileGrid,
    attributions: buildLayerAttribution(layer),
    url: (z, x, y) => {
      return tileUrlTemplate
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(y));
    }
  });

  return new TileLayer({
    source,
    extent: layer.extent.crsUnits,
    maxResolution: layer.tile.maxResolution,
    minResolution: layer.tile.minResolution,
    zIndex: layer.zIndex,
    visible: isLayerVisible(layer, layerVisibility)
  });
}
