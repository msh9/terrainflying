import { createCustomZxyLayer } from "./create-custom-zxy-layer";
import { createRasterPmtilesLayer } from "./create-raster-pmtiles-layer";
import { createVectorPmtilesLayer } from "./create-vector-pmtiles-layer";

export function createLayer(
  args,
  {
    createVectorPmtilesLayer: createVector = createVectorPmtilesLayer,
    createRasterPmtilesLayer: createRaster = createRasterPmtilesLayer,
    createCustomZxyLayer: createCustom = createCustomZxyLayer
  } = {}
) {
  const { layer } = args;
  const tile = layer?.tile ?? {};

  if (tile.scheme === "pmtiles" && tile.format === "mvt") {
    const isNavaid = tile.vectorLayerKind === "navaids";
    return {
      layer: createVector(args),
      interactiveNavaid: isNavaid,
      interactiveObstacle: !isNavaid
    };
  }

  if (tile.scheme === "pmtiles") {
    return {
      layer: createRaster(args),
      interactiveObstacle: false
    };
  }

  return {
    layer: createCustom(args),
    interactiveObstacle: false
  };
}
