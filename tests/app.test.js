import { describe, expect, it } from "vitest";
import { renderApp } from "../src/app";

describe("renderApp", () => {
  it("mounts the tile viewer app with defaults", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const app = renderApp(root, { autoLoad: false, mapEnabled: false });

    expect(root.querySelector("tile-viewer-app")).not.toBeNull();
    expect(app.manifestUrl).toBe("/map-config.json");
    expect(app.autoLoad).toBe(false);

    await app.updateComplete;
    const mapHost = app.querySelector("tile-map-host");
    if (mapHost?.updateComplete) {
      await mapHost.updateComplete;
    }
    expect(app.querySelector("[data-role='cursor-value']")).not.toBeNull();
    expect(app.querySelector("[data-role='rotation-minus']")).not.toBeNull();
    expect(app.querySelector("[data-role='rotation-plus']")).not.toBeNull();
    expect(app.querySelector("[data-role='rotation-reset']")).not.toBeNull();
    expect(app.querySelector("[data-role='north-value']")).not.toBeNull();

    root.remove();
  });
});
