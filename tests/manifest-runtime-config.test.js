import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_MANIFEST_URL, getConfiguredManifestUrl } from "../src/manifest/index.js";

describe("manifest URL configuration", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    delete window.FLYER_MAPS_CONFIG;
  });

  it("uses the default manifest URL when no config is present", () => {
    expect(
      getConfiguredManifestUrl({
        search: "",
        documentRef: null,
        globalConfig: null
      })
    ).toBe(DEFAULT_MANIFEST_URL);
  });

  it("uses the manifest URL from a document meta tag", () => {
    document.head.innerHTML =
      '<meta name="flyer-manifest-url" content="https://media.example.com/releases/2026-02-12/map-layer-config.json" />';

    expect(getConfiguredManifestUrl({ search: "" })).toBe(
      "https://media.example.com/releases/2026-02-12/map-layer-config.json"
    );
  });

  it("uses global config when provided", () => {
    window.FLYER_MAPS_CONFIG = {
      manifestUrl: "https://media.example.com/releases/global-map-layer-config.json"
    };

    expect(getConfiguredManifestUrl({ search: "" })).toBe(
      "https://media.example.com/releases/global-map-layer-config.json"
    );
  });

  it("prioritizes query string manifestUrl over all other config", () => {
    window.FLYER_MAPS_CONFIG = {
      manifestUrl: "https://media.example.com/releases/global-map-layer-config.json"
    };
    document.head.innerHTML =
      '<meta name="flyer-manifest-url" content="https://media.example.com/releases/meta-map-layer-config.json" />';

    expect(
      getConfiguredManifestUrl({
        search:
          "?manifestUrl=https%3A%2F%2Fmedia.example.com%2Freleases%2Fquery-map-layer-config.json"
      })
    ).toBe("https://media.example.com/releases/query-map-layer-config.json");
  });
});
