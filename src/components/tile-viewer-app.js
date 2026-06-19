import { LitElement, html } from "lit";
import { fetchManifest, DEFAULT_MANIFEST_URL } from "../manifest/index.js";
import { buildLayerVisibility } from "../map/layers/visibility";
import "./tile-app-header";
import "./tile-map-host";
import "./tile-layer-panel";

export class TileViewerApp extends LitElement {
  static properties = {
    manifestUrl: { type: String, attribute: "manifest-url" },
    mapEnabled: { type: Boolean, attribute: "map-enabled" },
    autoLoad: { type: Boolean, attribute: "auto-load" },
    status: { state: true },
    errorMessage: { state: true },
    manifest: { state: true },
    layerVisibility: { state: true },
    autoRotateEnabled: { state: true },
    rotationText: { state: true },
    cursorText: { state: true },
    showCursor: { state: true }
  };

  constructor() {
    super();
    this.manifestUrl = DEFAULT_MANIFEST_URL;
    this.mapEnabled = true;
    this.autoLoad = true;
    this.status = "idle";
    this.errorMessage = "";
    this.manifest = null;
    this.layerVisibility = {};
    this.autoRotateEnabled = false;
    this.rotationText = "0.0 deg";
    this.cursorText = "Lat -- | Lon --";
    this.showCursor = true;
    this.handleGlobalPointerMove = (event) => this.onGlobalPointerMove(event);
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.initializeCursorVisibility();
    if (this.autoLoad) {
      this.loadManifest();
    }
  }

  disconnectedCallback() {
    this.removePointerUpgradeListener();
    super.disconnectedCallback();
  }

  get mapHost() {
    return this.querySelector("tile-map-host");
  }

  get map() {
    return this.mapHost?.map ?? null;
  }

  get layerMap() {
    return this.mapHost?.layerMap ?? null;
  }

  get mapInitialized() {
    return Boolean(this.mapHost?.mapInitialized);
  }

  async loadManifest() {
    this.status = "loading";
    this.errorMessage = "";
    try {
      const { manifest, manifestUrl } = await fetchManifest(this.manifestUrl);
      this.manifest = manifest;
      this.manifestUrl = manifestUrl;
      this.initializeLayerVisibility(manifest.layers ?? []);
      this.status = "ready";
      this.requestUpdate();
    } catch (error) {
      this.status = "error";
      this.errorMessage = error instanceof Error ? error.message : String(error);
      this.requestUpdate();
    }
  }

  initializeLayerVisibility(layers) {
    this.layerVisibility = buildLayerVisibility(layers);
  }

  handleLayerToggle(event) {
    const layerId = event?.detail?.layerId;
    if (!layerId) {
      return;
    }
    this.layerVisibility = {
      ...this.layerVisibility,
      [layerId]: Boolean(event.detail.visible)
    };
  }

  handleRotateStep(event) {
    const deltaDegrees = event?.detail?.deltaDegrees;
    if (!Number.isFinite(deltaDegrees)) {
      return;
    }
    this.mapHost?.queueRotationDelta(deltaDegrees);
  }

  handleRotateReset() {
    this.mapHost?.resetRotation();
  }

  handleAutoRotateToggle(event) {
    this.autoRotateEnabled = Boolean(event?.detail?.enabled);
  }

  handleMapRotationChange(event) {
    const label = event?.detail?.label;
    if (typeof label === "string") {
      this.rotationText = label;
    }
  }

  handleMapCursorChange(event) {
    const text = event?.detail?.text;
    if (typeof text === "string") {
      this.cursorText = text;
    }
  }

  initializeCursorVisibility() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      this.showCursor = true;
      return;
    }

    const touchMedia = window.matchMedia("(hover: none), (pointer: coarse)");
    this.showCursor = !touchMedia.matches;

    if (!this.showCursor) {
      this.installPointerUpgradeListener();
    } else {
      this.removePointerUpgradeListener();
    }
  }

  installPointerUpgradeListener() {
    window.addEventListener("pointermove", this.handleGlobalPointerMove, { passive: true });
  }

  removePointerUpgradeListener() {
    if (typeof window === "undefined") {
      return;
    }
    window.removeEventListener("pointermove", this.handleGlobalPointerMove);
  }

  onGlobalPointerMove(event) {
    const pointerType = event?.pointerType;
    if (!pointerType || pointerType === "touch") {
      return;
    }
    this.showCursor = true;
    this.removePointerUpgradeListener();
  }

  render() {
    const layers = this.manifest?.layers ?? [];

    return html`
      <section class="app-shell">
        <tile-app-header
          .cursorText=${this.cursorText}
          .showCursor=${this.showCursor}
        ></tile-app-header>
        <main class="map-shell">
          <tile-map-host
            .manifest=${this.manifest}
            .manifestUrl=${this.manifestUrl}
            .mapEnabled=${this.mapEnabled}
            .layerVisibility=${this.layerVisibility}
            .autoRotateEnabled=${this.autoRotateEnabled}
            @rotation-change=${(event) => this.handleMapRotationChange(event)}
            @cursor-change=${(event) => this.handleMapCursorChange(event)}
          ></tile-map-host>
          <tile-layer-panel
            .layers=${layers}
            .layerVisibility=${this.layerVisibility}
            .autoRotateEnabled=${this.autoRotateEnabled}
            .rotationText=${this.rotationText}
            @layer-toggle=${(event) => this.handleLayerToggle(event)}
            @rotate-step=${(event) => this.handleRotateStep(event)}
            @rotate-reset=${() => this.handleRotateReset()}
            @auto-rotate-toggle=${(event) => this.handleAutoRotateToggle(event)}
          ></tile-layer-panel>
          ${this.status === "error"
            ? html`<div class="map-error">${this.errorMessage}</div>`
            : null}
        </main>
      </section>
    `;
  }
}

if (!customElements.get("tile-viewer-app")) {
  customElements.define("tile-viewer-app", TileViewerApp);
}
