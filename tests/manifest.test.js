import { describe, expect, it } from "vitest";
import { resolveTileUrlTemplate, validateManifest } from "../src/manifest/index.js";

const validManifest = {
  schemaVersion: "3.0",
  crs: {
    value: "WKT_DEFINITION",
    wgs84Transform: null
  },
  extent: {
    crsUnits: [0, 0, 4096, 4096]
  },
  view: {
    resolutions: [640, 320, 160],
    defaultResolution: 640
  },
  layers: [
    {
      id: "vfr",
      name: "VFR Sectionals",
      zIndex: 0,
      extent: {
        crsUnits: [0, 0, 4096, 4096]
      },
      tile: {
        scheme: "custom-zxy",
        tileSizePx: 512,
        format: "webp",
        origin: [0, 4096],
        resolutions: [640, 320, 160],
        minResolution: 160,
        maxResolution: 640,
        urlTemplate: "tiles/vfr/{z}/{x}/{y}.webp"
      },
      attribution: "Federal Aviation Administration"
    },
    {
      id: "tac",
      name: "Terminal Area Charts",
      optional: true,
      defaultVisible: true,
      uiLabel: "Terminal Area Charts (TAC)",
      zIndex: 10,
      extent: {
        crsUnits: [1024, 1024, 3072, 3072]
      },
      tile: {
        scheme: "pmtiles",
        tileSizePx: 512,
        format: "webp",
        origin: [1024, 3072],
        resolutions: [320, 160],
        minResolution: 160,
        maxResolution: 320,
        archiveUrl: "tiles/tac/tac.pmtiles",
        archiveZoomOffset: 2
      },
      attribution: "Federal Aviation Administration"
    }
  ]
};

describe("manifest validation", () => {
  it("accepts a schema-compliant manifest", () => {
    expect(validateManifest(validManifest)).toEqual(validManifest);
  });

  it("requires view defaults when no fallback tile resolutions exist", () => {
    const missingView = JSON.parse(JSON.stringify(validManifest));
    delete missingView.view;
    expect(() => validateManifest(missingView)).toThrow("Invalid tile manifest");
  });

  it("rejects an invalid manifest", () => {
    expect(() => validateManifest({})).toThrow("Invalid tile manifest");
  });

  it("requires archiveUrl for pmtiles layers", () => {
    const missingArchive = JSON.parse(JSON.stringify(validManifest));
    delete missingArchive.layers[1].tile.archiveUrl;
    expect(() => validateManifest(missingArchive)).toThrow("Invalid tile manifest");
  });

  it("accepts a pmtiles vector layer format", () => {
    const vectorManifest = JSON.parse(JSON.stringify(validManifest));
    vectorManifest.layers[1].tile.format = "mvt";
    expect(validateManifest(vectorManifest)).toEqual(vectorManifest);
  });

  it("normalizes legacy attribution objects to strings", () => {
    const legacy = JSON.parse(JSON.stringify(validManifest));
    legacy.layers[0].attribution = { text: "FAA" };

    const normalized = validateManifest(legacy);
    expect(normalized.layers[0].attribution).toBe("FAA");
  });

  it("upgrades raster tile_config style manifests", () => {
    const rasterManifest = {
      schemaVersion: "1.0",
      crs: {
        type: "wkt",
        value: "WKT_DEFINITION"
      },
      tile: {
        tileSizePx: 512,
        format: "webp",
        origin: [0, 4096],
        resolutions: [640, 320, 160]
      },
      extent: {
        crsUnits: [0, 0, 4096, 4096],
        wgs84: [-120, 40, -110, 45]
      },
      attribution: "Federal Aviation Administration"
    };

    const normalized = validateManifest(rasterManifest);
    expect(normalized.schemaVersion).toBe("3.0");
    expect(normalized.view).toEqual({
      resolutions: [640, 320, 160],
      defaultResolution: 320
    });
    expect(normalized.layers).toHaveLength(1);
    expect(normalized.layers[0].tile).toMatchObject({
      scheme: "custom-zxy",
      minResolution: 160,
      maxResolution: 640,
      urlTemplate: "tiles/{z}/{x}/{y}.webp"
    });
    expect(normalized.layers[0].attribution).toBe("Federal Aviation Administration");
  });

  it("allows layer blocks to reuse top-level tilemaker fragments", () => {
    const shared = {
      schemaVersion: "3.0",
      crs: {
        value: "WKT_DEFINITION"
      },
      extent: {
        crsUnits: [0, 0, 4096, 4096]
      },
      view: {
        resolutions: [640, 320, 160],
        defaultResolution: 320
      },
      tile: {
        tileSizePx: 512,
        format: "webp",
        origin: [0, 4096],
        resolutions: [640, 320, 160]
      },
      attribution: "FAA",
      layers: [
        {
          id: "vfr",
          name: "VFR Sectionals",
          zIndex: 0,
          extent: {
            crsUnits: [0, 0, 4096, 4096]
          }
        }
      ]
    };

    const normalized = validateManifest(shared);
    expect(normalized.layers[0].tile).toMatchObject({
      scheme: "custom-zxy",
      tileSizePx: 512,
      format: "webp",
      minResolution: 160,
      maxResolution: 640,
      urlTemplate: "tiles/{z}/{x}/{y}.webp"
    });
    expect(normalized.layers[0].attribution).toBe("FAA");
  });
});

describe("layer release metadata", () => {
  it("preserves release.effectiveDate through normalization", () => {
    const manifest = JSON.parse(JSON.stringify(validManifest));
    manifest.layers[0].release = { effectiveDate: "2025-01-23" };

    const normalized = validateManifest(manifest);
    expect(normalized.layers[0].release).toEqual({ effectiveDate: "2025-01-23" });
  });

  it("preserves release.dataCutDate through normalization", () => {
    const manifest = JSON.parse(JSON.stringify(validManifest));
    manifest.layers[0].release = { dataCutDate: "2025-01-01" };

    const normalized = validateManifest(manifest);
    expect(normalized.layers[0].release).toEqual({ dataCutDate: "2025-01-01" });
  });

  it("preserves release.dataWindow through normalization", () => {
    const manifest = JSON.parse(JSON.stringify(validManifest));
    manifest.layers[0].release = { dataWindow: { start: "2024-07-01", end: "2025-01-01" } };

    const normalized = validateManifest(manifest);
    expect(normalized.layers[0].release).toEqual({
      dataWindow: { start: "2024-07-01", end: "2025-01-01" }
    });
  });

  it("lifts legacy flat effectiveDate into release.effectiveDate", () => {
    const manifest = JSON.parse(JSON.stringify(validManifest));
    manifest.layers[0].effectiveDate = "2025-01-23";

    const normalized = validateManifest(manifest);
    expect(normalized.layers[0].release).toEqual({ effectiveDate: "2025-01-23" });
  });

  it("leaves release undefined when neither release nor effectiveDate is present", () => {
    const normalized = validateManifest(validManifest);
    expect(normalized.layers[0].release).toBeUndefined();
  });
});

describe("slope shading layer", () => {
  it("accepts a manifest with rasterStyle slope-shading", () => {
    const slopeManifest = JSON.parse(JSON.stringify(validManifest));
    slopeManifest.layers[1].tile.format = "avif";
    slopeManifest.layers[1].tile.rasterStyle = "slope-shading";
    expect(validateManifest(slopeManifest)).toBeTruthy();
  });

  it("preserves rasterStyle through normalization", () => {
    const slopeManifest = JSON.parse(JSON.stringify(validManifest));
    slopeManifest.layers[1].tile.format = "avif";
    slopeManifest.layers[1].tile.rasterStyle = "slope-shading";

    const normalized = validateManifest(slopeManifest);
    expect(normalized.layers[1].tile.rasterStyle).toBe("slope-shading");
  });

  it("omits rasterStyle when not present in input", () => {
    const normalized = validateManifest(validManifest);
    expect(normalized.layers[0].tile.rasterStyle).toBeUndefined();
  });

  it("accepts png format for slope-shading layers", () => {
    const slopeManifest = JSON.parse(JSON.stringify(validManifest));
    slopeManifest.layers[1].tile.format = "png";
    slopeManifest.layers[1].tile.rasterStyle = "slope-shading";
    const normalized = validateManifest(slopeManifest);
    expect(normalized).toBeTruthy();
    expect(normalized.layers[1].tile.format).toBe("png");
  });
});

describe("landsat imagery layer", () => {
  it("accepts a manifest with an optional landsat imagery layer", () => {
    const landsatManifest = JSON.parse(JSON.stringify(validManifest));
    landsatManifest.layers.push({
      id: "landsat-imagery",
      name: "Satellite Imagery (Landsat)",
      optional: true,
      defaultVisible: false,
      uiLabel: "Satellite Imagery",
      zIndex: -1,
      release: {
        dataWindow: { start: "2024-04-01", end: "2024-10-31" }
      },
      extent: {
        crsUnits: [0, 0, 4096, 4096]
      },
      tile: {
        scheme: "pmtiles",
        tileSizePx: 512,
        format: "avif",
        origin: [0, 4096],
        resolutions: [640, 320, 160, 80, 40, 20],
        minResolution: 20,
        maxResolution: 640,
        archiveUrl: "tiles/landsat/landsat-imagery.pmtiles"
      },
      attribution: "U.S. Geological Survey"
    });
    const normalized = validateManifest(landsatManifest);
    expect(normalized).toBeTruthy();
    expect(normalized.layers).toHaveLength(3);
  });

  it("preserves dataWindow release metadata for landsat layer", () => {
    const landsatManifest = JSON.parse(JSON.stringify(validManifest));
    landsatManifest.layers.push({
      id: "landsat-imagery",
      name: "Satellite Imagery (Landsat)",
      optional: true,
      defaultVisible: false,
      uiLabel: "Satellite Imagery",
      zIndex: -1,
      release: {
        dataWindow: { start: "2024-04-01", end: "2024-10-31" }
      },
      extent: {
        crsUnits: [0, 0, 4096, 4096]
      },
      tile: {
        scheme: "pmtiles",
        tileSizePx: 512,
        format: "avif",
        origin: [0, 4096],
        resolutions: [640, 320, 160, 80, 40, 20],
        minResolution: 20,
        maxResolution: 640,
        archiveUrl: "tiles/landsat/landsat-imagery.pmtiles"
      },
      attribution: "U.S. Geological Survey"
    });
    const normalized = validateManifest(landsatManifest);
    const landsatLayer = normalized.layers.find((l) => l.id === "landsat-imagery");
    expect(landsatLayer.release).toEqual({
      dataWindow: { start: "2024-04-01", end: "2024-10-31" }
    });
  });

  it("does not set rasterStyle for landsat imagery layer", () => {
    const landsatManifest = JSON.parse(JSON.stringify(validManifest));
    landsatManifest.layers.push({
      id: "landsat-imagery",
      name: "Satellite Imagery (Landsat)",
      zIndex: -1,
      extent: { crsUnits: [0, 0, 4096, 4096] },
      tile: {
        scheme: "pmtiles",
        tileSizePx: 512,
        format: "avif",
        origin: [0, 4096],
        resolutions: [640, 320, 160],
        minResolution: 160,
        maxResolution: 640,
        archiveUrl: "tiles/landsat/landsat-imagery.pmtiles"
      },
      attribution: "U.S. Geological Survey"
    });
    const normalized = validateManifest(landsatManifest);
    const landsatLayer = normalized.layers.find((l) => l.id === "landsat-imagery");
    expect(landsatLayer.tile.rasterStyle).toBeUndefined();
  });
});

describe("manifest URL handling", () => {
  it("resolves tile templates relative to the manifest URL", () => {
    const resolved = resolveTileUrlTemplate("tiles/{z}/{x}/{y}.webp", "/tiles/manifest.json");
    expect(resolved).toContain("/tiles/tiles/{z}/{x}/{y}.webp");
  });
});
