import { LitElement, html } from "lit";

export class TileAppHeader extends LitElement {
  static properties = {
    cursorText: { type: String },
    showCursor: { type: Boolean, attribute: "show-cursor" }
  };

  constructor() {
    super();
    this.cursorText = "Lat -- | Lon --";
    this.showCursor = true;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <header class="app-header">
        <div class="app-title-block">
          <h1>
            Flying Terrain --
            <strong>NOT FOR NAVIGATION -- MAPS MAY BE OUTDATED</strong>
          </h1>
        </div>
        ${this.showCursor
          ? html`<div class="app-cursor" aria-label="Cursor location">
              <span class="overlay-label">Cursor Location</span>
              <span class="overlay-value" data-role="cursor-value">${this.cursorText}</span>
            </div>`
          : null}
      </header>
    `;
  }
}

if (!customElements.get("tile-app-header")) {
  customElements.define("tile-app-header", TileAppHeader);
}
