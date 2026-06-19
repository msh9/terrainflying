import proj4 from "proj4";
import { addCoordinateTransforms, addProjection, get } from "ol/proj";
import Projection from "ol/proj/Projection";
import { getManifestProjectionConfig } from "../manifest/projection-config.js";

export const WGS84 = "EPSG:4326";
const WEB_MERCATOR = "EPSG:3857";

export function ensureProjection(manifest) {
  const extent = manifest.extent.crsUnits;
  const { code, definition } = getManifestProjectionConfig(manifest);
  let projection = get(code);
  if (!projection) {
    projection = new Projection({
      code,
      units: "m",
      extent,
      axisOrientation: "enu"
    });
    addProjection(projection);

    addCoordinateTransforms(
      projection,
      get(WGS84),
      (coordinate) => proj4(definition, WGS84, coordinate),
      (coordinate) => proj4(WGS84, definition, coordinate)
    );
    addCoordinateTransforms(
      projection,
      get(WEB_MERCATOR),
      (coordinate) => proj4(definition, WEB_MERCATOR, coordinate),
      (coordinate) => proj4(WEB_MERCATOR, definition, coordinate)
    );
  } else {
    projection.setExtent(extent);
  }
  return projection;
}
