import OlMap from "ol/Map";
import View from "ol/View";
import ScaleLine from "ol/control/ScaleLine";
import { defaults as defaultControls } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import DragRotate from "ol/interaction/DragRotate";
import { getCenter } from "ol/extent";
import { transform } from "ol/proj";
import { attachMeasurement } from "./measure";
import { attachObstaclePopup } from "./obstacle-popup";
import { createNavaidPopup } from "./navaid-popup";
import { createLayer } from "./map/layers/create-layer";
import { ensureProjection, WGS84 } from "./map/projection";

export function createMap({
  target,
  manifest,
  manifestUrl,
  onCursor,
  onRotation,
  layerVisibility
}) {
  const layers = manifest.layers ?? [];
  if (layers.length === 0) {
    throw new Error("Manifest must include at least one layer.");
  }

  const extent = manifest.extent.crsUnits;
  const projection = ensureProjection(manifest);
  const viewConfig = manifest.view;
  if (!viewConfig?.resolutions || viewConfig.resolutions.length === 0) {
    throw new Error("Manifest view resolutions are required.");
  }
  const { resolutions, defaultResolution } = viewConfig;

  const view = new View({
    projection,
    center: getCenter(extent),
    resolution: defaultResolution,
    resolutions,
    extent,
    constrainResolution: true,
    constrainOnlyCenter: true,
    constrainRotation: 120
  });

  const layerMap = new Map();
  const interactiveObstacleLayers = new Set();
  const interactiveNavaidLayers = new Set();
  const tileLayers = layers.map((layer) => {
    const layerResult = createLayer({
      layer,
      projection,
      manifestUrl,
      layerVisibility
    });
    layerMap.set(layer.id, layerResult.layer);
    if (layerResult.interactiveObstacle) {
      interactiveObstacleLayers.add(layerResult.layer);
    }
    if (layerResult.interactiveNavaid) {
      interactiveNavaidLayers.add(layerResult.layer);
    }
    return layerResult.layer;
  });

  const controls = defaultControls();
  controls.extend([
    new ScaleLine({
      bar: true,
      steps: 4,
      text: true,
      minWidth: 120,
      units: "metric"
    })
  ]);

  const map = new OlMap({
    target,
    layers: tileLayers,
    view,
    controls,
    interactions: defaultInteractions({
      altShiftDragRotate: true,
      pinchRotate: false
    })
  });

  let dragRotateInteraction = null;
  map.getInteractions().forEach((interaction) => {
    if (interaction instanceof DragRotate) {
      dragRotateInteraction = interaction;
    }
  });

  const measurement = attachMeasurement(map);
  const obstaclePopup = interactiveObstacleLayers.size > 0 ? attachObstaclePopup(map) : null;
  const navaidPopup = interactiveNavaidLayers.size > 0 ? createNavaidPopup(map) : null;

  if (obstaclePopup || navaidPopup) {
    map.on("singleclick", (event) => {
      if (navaidPopup) {
        const hit = map.forEachFeatureAtPixel(
          event.pixel,
          (f, l) => (interactiveNavaidLayers.has(l) && l.getVisible() ? f : undefined),
          { hitTolerance: 6 }
        );
        if (hit) {
          navaidPopup.show(hit, event.coordinate);
          obstaclePopup?.hide();
          return;
        }
        navaidPopup.hide();
      }
      if (obstaclePopup) {
        const hit = map.forEachFeatureAtPixel(
          event.pixel,
          (f, l) => (interactiveObstacleLayers.has(l) && l.getVisible() ? f : undefined),
          { hitTolerance: 6 }
        );
        if (hit) {
          obstaclePopup.show(hit, event.coordinate);
          return;
        }
        obstaclePopup.hide();
      }
    });
  }

  const getCursorState = (event) => ({
    lonLat: transform(event.coordinate, projection, WGS84),
    coordinate: event.coordinate,
    zoom: view.getZoom(),
    resolution: view.getResolution()
  });

  map.on("pointermove", (event) => {
    if (event.dragging) {
      return;
    }
    if (onCursor) {
      onCursor(getCursorState(event));
    }
  });

  map.getViewport().addEventListener("mouseleave", () => {
    if (onCursor) {
      onCursor({
        lonLat: null,
        coordinate: null,
        zoom: view.getZoom(),
        resolution: view.getResolution()
      });
    }
  });

  if (onRotation) {
    onRotation(view.getRotation());
    view.on("change:rotation", () => {
      onRotation(view.getRotation());
    });
  }

  return {
    map,
    view,
    projection,
    measurement,
    obstaclePopup,
    navaidPopup,
    layerMap,
    dragRotateInteraction
  };
}
