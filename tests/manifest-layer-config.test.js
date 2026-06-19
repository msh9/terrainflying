import { describe, expect, it } from "vitest";
import {
  getLayerTileGridConfig,
  getManifestProjectionConfig,
  shouldUseManifestVectorTileGrid
} from "../src/manifest/index.js";

describe("manifest layer config helpers", () => {
  it("builds tile-grid config from manifest layer tile metadata", () => {
    const layer = {
      extent: {
        crsUnits: [-512, -256, 1536, 768]
      },
      tile: {
        origin: [-512, 768],
        resolutions: [64, 32, 16, 8],
        tileSizePx: 512
      }
    };

    expect(getLayerTileGridConfig(layer)).toEqual({
      extent: [-512, -256, 1536, 768],
      origin: [-512, 768],
      resolutions: [64, 32, 16, 8],
      tileSize: 512
    });
  });

  it("rejects incomplete tile-grid metadata", () => {
    expect(() =>
      getLayerTileGridConfig({
        extent: { crsUnits: [0, 0, 1, 1] },
        tile: { resolutions: [16], tileSizePx: 512 }
      })
    ).toThrow("Layer tile origin is required.");
  });

  it("uses the same projection identity for the same CRS definition", () => {
    const first = getManifestProjectionConfig({
      crs: {
        value: 'PROJCS["A"]',
        wgs84Transform: null
      }
    });
    const second = getManifestProjectionConfig({
      crs: {
        value: 'PROJCS["A"]',
        wgs84Transform: null
      }
    });

    expect(first.definition).toBe('PROJCS["A"]');
    expect(first.code).toBe(second.code);
  });

  it("uses different projection identities for different CRS definitions", () => {
    const first = getManifestProjectionConfig({
      crs: {
        value: 'PROJCS["A"]',
        wgs84Transform: null
      }
    });
    const second = getManifestProjectionConfig({
      crs: {
        value: 'PROJCS["B"]',
        wgs84Transform: null
      }
    });

    expect(first.code).not.toBe(second.code);
  });

  it("prefers a non-empty wgs84Transform over value", () => {
    const projection = getManifestProjectionConfig({
      crs: {
        value: 'PROJCS["fallback"]',
        wgs84Transform: 'PROJCS["preferred"]'
      }
    });

    expect(projection.definition).toBe('PROJCS["preferred"]');
  });

  it("uses manifest vector tile-grid when an explicit zoom mapping is provided", () => {
    expect(
      shouldUseManifestVectorTileGrid({
        scheme: "pmtiles",
        format: "mvt",
        archiveZoomByLocalZoom: { 0: 2 }
      })
    ).toBe(true);
  });

  it("uses archive-native vector grid when no explicit mapping exists", () => {
    expect(
      shouldUseManifestVectorTileGrid({
        scheme: "pmtiles",
        format: "mvt",
        archiveMinZoom: 2,
        archiveMaxZoom: 9
      })
    ).toBe(false);
  });
});
