import { LitElement, html } from "lit";
import { transform } from "ol/proj";
import { unByKey } from "ol/Observable";
import { formatRotation, formatLonLat } from "../format";
import { createMap } from "../map";
import {
  AUTO_ROTATE_PIXEL_DELTA,
  autoRotationDeltaRadians,
  bearingRadians,
  clampRotationRadians,
  degreesToRadians
} from "../rotation";
import { isLayerVisible } from "../map/layers/visibility";

const ROTATION_DEBOUNCE_MS = 100;
const AUTO_ROTATE_DEBOUNCE_MS = 500;
const AUTO_ROTATE_LAT_DELTA = 0.25;
const WGS84 = "EPSG:4326";

export class TileMapHost extends LitElement {
  static properties = {
    manifest: { state: true },
    manifestUrl: { type: String, attribute: "manifest-url" },
    mapEnabled: { type: Boolean, attribute: "map-enabled" },
    layerVisibility: { state: true },
    autoRotateEnabled: { type: Boolean, attribute: "auto-rotate-enabled" }
  };

  constructor() {
    super();
    this.manifest = null;
    this.manifestUrl = "";
    this.mapEnabled = true;
    this.layerVisibility = {};
    this.autoRotateEnabled = false;
    this.mapInitialized = false;
    this.map = null;
    this.layerMap = null;
    this.view = null;
    this.projection = null;
    this.dragRotateInteraction = null;
    this.measurement = null;
    this.obstaclePopup = null;
    this.navaidPopup = null;
    this.rotationTimer = null;
    this.rotationQueuedDelta = 0;
    this.autoRotateTimer = null;
    this.autoRotateListenerKeys = [];
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.mapTarget = this.querySelector("[data-role='map']");
    this.initializeMap();
  }

  updated(changedProperties) {
    const sourceChanged = changedProperties.has("manifest") || changedProperties.has("manifestUrl");

    if (sourceChanged && this.mapInitialized) {
      this.destroyMap();
      this.initializeMap();
    } else if (!this.mapInitialized) {
      this.initializeMap();
    }

    if (this.mapInitialized && changedProperties.has("layerVisibility")) {
      this.applyLayerVisibility();
    }

    if (changedProperties.has("autoRotateEnabled")) {
      this.applyAutoRotateMode();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyMap();
    this.resetRotationQueue();
    this.resetAutoRotateTimer();
    this.detachAutoRotateListeners();
  }

  destroyMap() {
    if (this.measurement) {
      this.measurement.dispose();
      this.measurement = null;
    }
    if (this.obstaclePopup) {
      this.obstaclePopup.dispose();
      this.obstaclePopup = null;
    }
    if (this.navaidPopup) {
      this.navaidPopup.dispose();
      this.navaidPopup = null;
    }
    if (this.map) {
      this.map.setTarget(null);
      this.map = null;
    }
    this.layerMap = null;
    this.view = null;
    this.projection = null;
    this.dragRotateInteraction = null;
    this.mapInitialized = false;
    this.updateCursor(null);
  }

  initializeMap() {
    if (this.mapInitialized || !this.mapEnabled || !this.manifest) {
      return;
    }
    if (!this.mapTarget) {
      return;
    }

    this.mapInitialized = true;
    const {
      map,
      view,
      layerMap,
      dragRotateInteraction,
      projection,
      measurement,
      obstaclePopup,
      navaidPopup
    } = createMap({
      target: this.mapTarget,
      manifest: this.manifest,
      manifestUrl: this.manifestUrl,
      onCursor: (cursorState) => this.updateCursor(cursorState),
      onRotation: (rotation) => this.updateRotation(rotation),
      layerVisibility: this.layerVisibility
    });

    this.map = map;
    this.layerMap = layerMap;
    this.view = view;
    this.projection = projection;
    this.dragRotateInteraction = dragRotateInteraction;
    this.measurement = measurement;
    this.obstaclePopup = obstaclePopup;
    this.navaidPopup = navaidPopup;
    this.applyAutoRotateMode();
    this.updateCursor(null);
    this.updateRotation(view.getRotation());
  }

  applyLayerVisibility() {
    if (!this.layerMap || !this.manifest) {
      return;
    }
    (this.manifest.layers ?? []).forEach((layer) => {
      const tileLayer = this.layerMap.get(layer.id);
      if (!tileLayer) {
        return;
      }
      const visible = isLayerVisible(layer, this.layerVisibility);
      tileLayer.setVisible(visible);
      if (!visible) {
        this.obstaclePopup?.hide();
        this.navaidPopup?.hide();
      }
    });
  }

  updateCursor(cursorState) {
    this.dispatchEvent(
      new CustomEvent("cursor-change", {
        detail: {
          text: formatLonLat(cursorState)
        },
        bubbles: true,
        composed: true
      })
    );
  }

  updateRotation(rotation) {
    const label = formatRotation(rotation);
    this.dispatchEvent(
      new CustomEvent("rotation-change", {
        detail: {
          rotation,
          label
        },
        bubbles: true,
        composed: true
      })
    );
  }

  queueRotationDelta(deltaDegrees) {
    if (!this.view || this.autoRotateEnabled) {
      return;
    }
    this.rotationQueuedDelta += degreesToRadians(deltaDegrees);
    if (this.rotationTimer) {
      return;
    }
    this.rotationTimer = window.setTimeout(() => {
      this.applyQueuedRotation();
    }, ROTATION_DEBOUNCE_MS);
  }

  resetRotation() {
    if (!this.view || this.autoRotateEnabled) {
      return;
    }
    this.resetRotationQueue();
    this.view.setRotation(0);
  }

  applyQueuedRotation() {
    if (!this.view) {
      this.resetRotationQueue();
      return;
    }
    const current = this.view.getRotation() ?? 0;
    const target = clampRotationRadians(current + this.rotationQueuedDelta);
    this.resetRotationQueue();
    this.view.setRotation(target);
  }

  resetRotationQueue() {
    if (this.rotationTimer) {
      window.clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
    this.rotationQueuedDelta = 0;
  }

  applyAutoRotateMode() {
    if (this.dragRotateInteraction) {
      this.dragRotateInteraction.setActive(!this.autoRotateEnabled);
    }
    if (this.autoRotateEnabled) {
      this.attachAutoRotateListeners();
      this.scheduleAutoRotate();
      return;
    }
    this.detachAutoRotateListeners();
    this.resetAutoRotateTimer();
  }

  attachAutoRotateListeners() {
    if (!this.view || this.autoRotateListenerKeys.length > 0) {
      return;
    }
    this.autoRotateListenerKeys = [
      this.view.on("change:center", () => this.scheduleAutoRotate()),
      this.view.on("change:resolution", () => this.scheduleAutoRotate())
    ];
  }

  detachAutoRotateListeners() {
    this.autoRotateListenerKeys.forEach((key) => unByKey(key));
    this.autoRotateListenerKeys = [];
  }

  scheduleAutoRotate() {
    if (!this.autoRotateEnabled) {
      return;
    }
    this.resetAutoRotateTimer();
    this.autoRotateTimer = window.setTimeout(() => {
      this.applyAutoRotate();
    }, AUTO_ROTATE_DEBOUNCE_MS);
  }

  resetAutoRotateTimer() {
    if (this.autoRotateTimer) {
      window.clearTimeout(this.autoRotateTimer);
      this.autoRotateTimer = null;
    }
  }

  applyAutoRotate() {
    if (!this.autoRotateEnabled || !this.view) {
      return;
    }
    const targetRotation = this.computeAutoRotateTarget();
    if (!Number.isFinite(targetRotation)) {
      return;
    }
    this.view.setRotation(targetRotation);
  }

  computeAutoRotateTarget() {
    if (!this.map || !this.view || !this.projection) {
      return null;
    }
    const centerCoord = this.view.getCenter();
    if (!centerCoord) {
      return null;
    }
    const centerPixel = this.map.getPixelFromCoordinate(centerCoord);
    if (!centerPixel) {
      return null;
    }
    const upPixel = [centerPixel[0], centerPixel[1] - AUTO_ROTATE_PIXEL_DELTA];
    const upCoord = this.map.getCoordinateFromPixel(upPixel);
    if (!upCoord) {
      return null;
    }
    const centerLonLat = transform(centerCoord, this.projection, WGS84);
    const upLonLat = transform(upCoord, this.projection, WGS84);
    if (!centerLonLat || !upLonLat) {
      return null;
    }
    const northLonLat = [
      centerLonLat[0],
      Math.max(-89.9, Math.min(89.9, centerLonLat[1] + AUTO_ROTATE_LAT_DELTA))
    ];
    const bearingNorth = bearingRadians(centerLonLat, northLonLat);
    const bearingUp = bearingRadians(centerLonLat, upLonLat);
    const delta = autoRotationDeltaRadians(bearingNorth, bearingUp);
    const currentRotation = this.view.getRotation() ?? 0;
    return clampRotationRadians(currentRotation + delta);
  }

  render() {
    return html` <div class="map-canvas" data-role="map" aria-label="Chart map"></div> `;
  }
}

if (!customElements.get("tile-map-host")) {
  customElements.define("tile-map-host", TileMapHost);
}
