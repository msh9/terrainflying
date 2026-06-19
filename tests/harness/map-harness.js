import "ol/ol.css";
import "../../src/styles.css";
import { renderApp } from "../../src/app";

const params = new URLSearchParams(window.location.search);
const manifestUrl = params.get("manifestUrl") || "/tests/fixtures/manifest.multilayer.json";

const root = document.getElementById("map-harness");
const app = renderApp(root, {
  manifestUrl,
  mapEnabled: true,
  autoLoad: true
});

function markReady() {
  const map = app.map;
  const view = map.getView();
  window.__getMapState = () => ({
    center: view.getCenter(),
    zoom: view.getZoom(),
    resolution: view.getResolution(),
    resolutions: view.getResolutions(),
    minZoom: view.getMinZoom(),
    maxZoom: view.getMaxZoom(),
    extent: map.getView().getProjection().getExtent()
  });
  document.body.dataset.mapReady = "true";
}

function waitForMap() {
  if (app.mapInitialized && app.map) {
    markReady();
    return;
  }
  requestAnimationFrame(waitForMap);
}

waitForMap();
