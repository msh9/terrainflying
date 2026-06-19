import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { createXYZ } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid";
import MVT from "ol/format/MVT";
import Feature from "ol/Feature";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import TileState from "ol/TileState";
import { PMTiles } from "pmtiles";
import { resolveAssetUrl } from "../../manifest/index.js";
import { buildLayerAttribution } from "../../manifest/release-attribution.js";
import { isLayerVisible } from "./visibility";
import {
  getLayerTileGridConfig,
  shouldUseManifestVectorTileGrid
} from "../../manifest/layer-tile-config.js";
import { createArchiveZoomResolver } from "./pmtiles-zoom-resolver";

const OBSTACLE_POINT_STYLE = new Style({
  image: new CircleStyle({
    radius: 4,
    fill: new Fill({ color: "rgba(172, 80, 53, 0.86)" }),
    stroke: new Stroke({ color: "#fffaf7", width: 1.25 })
  })
});

const NAVAID_STYLES = {
  vor: new Style({
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({ color: "#3b82f6" }),
      stroke: new Stroke({ color: "#fffaf7", width: 1.25 })
    })
  }),
  ndb: new Style({
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({ color: "#f59e0b" }),
      stroke: new Stroke({ color: "#fffaf7", width: 1.25 })
    })
  }),
  tacan: new Style({
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({ color: "#10b981" }),
      stroke: new Stroke({ color: "#fffaf7", width: 1.25 })
    })
  }),
  other: new Style({
    image: new CircleStyle({
      radius: 3,
      fill: new Fill({ color: "#6b7280" }),
      stroke: new Stroke({ color: "#fffaf7", width: 1.25 })
    })
  })
};

function navaidStyleFunction(feature) {
  const navaidType = feature.get("navaid_type") ?? "";
  if (navaidType === "VOR" || navaidType === "VOR_DME" || navaidType === "VORTAC") {
    return NAVAID_STYLES.vor;
  }
  if (navaidType === "NDB" || navaidType === "NDB_DME") {
    return NAVAID_STYLES.ndb;
  }
  if (navaidType === "TACAN" || navaidType === "DME") {
    return NAVAID_STYLES.tacan;
  }
  return NAVAID_STYLES.other;
}

export function createVectorPmtilesLayer({
  layer,
  projection,
  manifestUrl,
  layerVisibility,
  archiveFactory = (archiveUrl) => new PMTiles(archiveUrl)
}) {
  const { tile } = layer;
  const useManifestGrid = shouldUseManifestVectorTileGrid(tile);
  const tileGrid = useManifestGrid
    ? new TileGrid(getLayerTileGridConfig(layer))
    : createXYZ({
        tileSize: tile.tileSizePx,
        minZoom: Number.isInteger(tile.archiveMinZoom) ? tile.archiveMinZoom : 0,
        maxZoom: Number.isInteger(tile.archiveMaxZoom) ? tile.archiveMaxZoom : 22
      });

  const archiveUrl = resolveAssetUrl(tile.archiveUrl, manifestUrl);
  const archive = archiveFactory(archiveUrl);
  const metadataPromise = archive.getMetadata().catch(() => ({}));
  const zoomResolverPromise = metadataPromise.then((metadata) =>
    createArchiveZoomResolver(tile, metadata, {
      defaultOffset:
        useManifestGrid && Number.isInteger(tile.archiveMinZoom) ? tile.archiveMinZoom : 0
    })
  );

  const source = new VectorTileSource({
    attributions: buildLayerAttribution(layer),
    projection,
    wrapX: false,
    tileGrid,
    format: new MVT({
      featureClass: Feature
    }),
    tileUrlFunction: (tileCoord) => {
      if (!tileCoord) {
        return undefined;
      }
      const [z, x, y] = tileCoord;
      return `${z}/${x}/${y}`;
    },
    tileLoadFunction: async (vectorTile) => {
      try {
        const tileCoord = vectorTile.getTileCoord();
        if (!tileCoord || tileCoord.length !== 3) {
          vectorTile.setFeatures([]);
          return;
        }
        const [sourceZoom, x, y] = tileCoord;
        const resolveZoom = await zoomResolverPromise;
        const archiveZoom = resolveZoom(sourceZoom);
        const response = await archive.getZxy(archiveZoom, x, y);
        if (!response) {
          vectorTile.setFeatures([]);
          return;
        }
        const features = vectorTile.getFormat().readFeatures(response.data, {
          extent: vectorTile.extent,
          featureProjection: vectorTile.projection
        });
        vectorTile.setFeatures(features);
      } catch {
        vectorTile.setState(TileState.ERROR);
      }
    }
  });

  return new VectorTileLayer({
    source,
    style: tile.vectorLayerKind === "navaids" ? navaidStyleFunction : OBSTACLE_POINT_STYLE,
    renderMode: "vector",
    extent: layer.extent.crsUnits,
    maxResolution: tile.maxResolution,
    minResolution: tile.minResolution,
    zIndex: layer.zIndex,
    visible: isLayerVisible(layer, layerVisibility)
  });
}
