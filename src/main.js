import "ol/ol.css";
import "./styles.css";
import { renderApp } from "./app";
import { getConfiguredManifestUrl } from "./manifest/index.js";

const root = document.getElementById("app");
if (root) {
  renderApp(root, { manifestUrl: getConfiguredManifestUrl() });
}
