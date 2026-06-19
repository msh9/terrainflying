import { LitElement, html } from "lit";
import { ROTATION_STEP_DEGREES } from "../rotation";

export class TileRotationPanel extends LitElement {
  static properties = {
    autoRotateEnabled: { type: Boolean, attribute: "auto-rotate-enabled" },
    rotationText: { type: String }
  };

  constructor() {
    super();
    this.autoRotateEnabled = false;
    this.rotationText = "0.0 deg";
  }

  createRenderRoot() {
    return this;
  }

  emitRotateStep(direction) {
    this.dispatchEvent(
      new CustomEvent("rotate-step", {
        detail: {
          direction,
          deltaDegrees: ROTATION_STEP_DEGREES * direction
        },
        bubbles: true,
        composed: true
      })
    );
  }

  emitRotateReset() {
    this.dispatchEvent(
      new CustomEvent("rotate-reset", {
        bubbles: true,
        composed: true
      })
    );
  }

  emitAutoRotateToggle(event) {
    const target = event?.currentTarget;
    this.dispatchEvent(
      new CustomEvent("auto-rotate-toggle", {
        detail: {
          enabled: Boolean(target?.checked)
        },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <section class="rotation-panel" aria-label="Rotation controls">
        <div class="rotation-panel-title">Rotation</div>
        <label class="rotation-toggle">
          <input
            type="checkbox"
            data-role="rotation-auto"
            .checked=${this.autoRotateEnabled}
            @change=${(event) => this.emitAutoRotateToggle(event)}
          />
          <span>Auto rotate</span>
        </label>
        <div class="rotation-controls">
          <button
            class="rotation-button"
            type="button"
            data-role="rotation-minus"
            aria-label="Rotate counterclockwise"
            ?disabled=${this.autoRotateEnabled}
            @click=${() => this.emitRotateStep(-1)}
          >
            -
          </button>
          <button
            class="rotation-button rotation-button--reset"
            type="button"
            data-role="rotation-reset"
            ?disabled=${this.autoRotateEnabled}
            @click=${() => this.emitRotateReset()}
          >
            Reset
          </button>
          <button
            class="rotation-button"
            type="button"
            data-role="rotation-plus"
            aria-label="Rotate clockwise"
            ?disabled=${this.autoRotateEnabled}
            @click=${() => this.emitRotateStep(1)}
          >
            +
          </button>
        </div>
        <div class="rotation-readout">
          <span data-role="north-value">${this.rotationText}</span>
        </div>
      </section>
    `;
  }
}

if (!customElements.get("tile-rotation-panel")) {
  customElements.define("tile-rotation-panel", TileRotationPanel);
}
