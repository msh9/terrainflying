import { LitElement, html } from "lit";
import { isLayerVisible } from "../map/layers/visibility";
import {
  getDisplayItems,
  getLayerUiLabel,
  isGroupVisible
} from "./layer-panel/layer-visibility-ui";
import "./tile-rotation-panel";

export class TileLayerPanel extends LitElement {
  static properties = {
    layers: { state: true },
    layerVisibility: { state: true },
    panelOpen: { state: true },
    autoRotateEnabled: { type: Boolean, attribute: "auto-rotate-enabled" },
    rotationText: { type: String, attribute: "rotation-text" }
  };

  constructor() {
    super();
    this.layers = [];
    this.layerVisibility = {};
    this.panelOpen = false;
    this.autoRotateEnabled = false;
    this.rotationText = "0.0 deg";
    this.handleWindowKeydown = (event) => this.onWindowKeydown(event);
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleWindowKeydown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleWindowKeydown);
    super.disconnectedCallback();
  }

  _groupMemberIds(groupId) {
    return (this.layers ?? []).filter((l) => l.groupId === groupId).map((l) => l.id);
  }

  handleToggle(event) {
    const target = event?.currentTarget;
    const groupId = target?.dataset?.groupId;
    if (groupId) {
      const visible = Boolean(target.checked);
      for (const layerId of this._groupMemberIds(groupId)) {
        this.dispatchEvent(
          new CustomEvent("layer-toggle", {
            detail: { layerId, visible },
            bubbles: true,
            composed: true
          })
        );
      }
      return;
    }

    const layerId = target?.dataset?.layerId;
    if (!layerId) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("layer-toggle", {
        detail: {
          layerId,
          visible: Boolean(target.checked)
        },
        bubbles: true,
        composed: true
      })
    );
  }

  onWindowKeydown(event) {
    if (event?.key === "Escape" && this.panelOpen) {
      this.closePanel();
    }
  }

  togglePanel() {
    this.panelOpen = !this.panelOpen;
  }

  closePanel() {
    this.panelOpen = false;
  }

  render() {
    const displayItems = getDisplayItems(this.layers ?? []);

    return html`<section
      class="layer-panel-shell"
      aria-label="Map options"
      data-open=${this.panelOpen ? "true" : "false"}
    >
      <button
        class="layer-panel-trigger"
        data-role="layer-panel-toggle"
        type="button"
        aria-expanded=${this.panelOpen ? "true" : "false"}
        aria-controls="layer-panel-content"
        @click=${() => this.togglePanel()}
      >
        Options
      </button>
      <button
        class="layer-panel-backdrop"
        data-role="layer-panel-backdrop"
        type="button"
        aria-label="Close options panel"
        @click=${() => this.closePanel()}
      ></button>
      <section
        class="layer-panel"
        id="layer-panel-content"
        data-open=${this.panelOpen ? "true" : "false"}
        aria-hidden=${this.panelOpen ? "false" : "true"}
      >
        <div class="layer-panel-header">
          <div class="layer-panel-title">Options</div>
          <button
            class="layer-panel-close"
            data-role="layer-panel-close"
            type="button"
            aria-label="Close options panel"
            @click=${() => this.closePanel()}
          >
            Close
          </button>
        </div>
        <tile-rotation-panel
          .autoRotateEnabled=${this.autoRotateEnabled}
          .rotationText=${this.rotationText}
        ></tile-rotation-panel>
        ${displayItems.length > 0
          ? html`<div class="layer-panel-section">
              <div class="layer-panel-title">Layers</div>
              <div class="layer-panel-list">
                ${displayItems.map((item) => {
                  if (item.type === "group") {
                    const checked = isGroupVisible(item.memberIds, this.layerVisibility);
                    return html`<label class="layer-toggle">
                      <input
                        type="checkbox"
                        data-group-id="${item.groupId}"
                        .checked=${checked}
                        @change=${(event) => this.handleToggle(event)}
                      />
                      <span>${item.groupLabel}</span>
                    </label>`;
                  }
                  const layer = item.layer;
                  const label = getLayerUiLabel(layer);
                  const checked = isLayerVisible(layer, this.layerVisibility);
                  return html`<label class="layer-toggle">
                    <input
                      type="checkbox"
                      data-layer-id="${layer.id}"
                      .checked=${checked}
                      @change=${(event) => this.handleToggle(event)}
                    />
                    <span
                      >${label}${layer.release?.effectiveDate
                        ? html`<small class="layer-toggle__date">
                            (${layer.release.effectiveDate})</small
                          >`
                        : null}</span
                    >
                  </label>`;
                })}
              </div>
            </div>`
          : null}
      </section>
    </section>`;
  }
}

if (!customElements.get("tile-layer-panel")) {
  customElements.define("tile-layer-panel", TileLayerPanel);
}
