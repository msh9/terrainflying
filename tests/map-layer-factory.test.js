import { describe, expect, it, vi } from "vitest";
import { createLayer } from "../src/map/layers/create-layer";

describe("map layer factory dispatch", () => {
  it("dispatches pmtiles+mvt to vector pmtiles factory", () => {
    const vectorLayer = { type: "vector" };
    const createVectorPmtilesLayer = vi.fn().mockReturnValue(vectorLayer);
    const createRasterPmtilesLayer = vi.fn();
    const createCustomZxyLayer = vi.fn();

    const result = createLayer(
      {
        layer: { tile: { scheme: "pmtiles", format: "mvt" } }
      },
      {
        createVectorPmtilesLayer,
        createRasterPmtilesLayer,
        createCustomZxyLayer
      }
    );

    expect(createVectorPmtilesLayer).toHaveBeenCalledTimes(1);
    expect(createRasterPmtilesLayer).not.toHaveBeenCalled();
    expect(createCustomZxyLayer).not.toHaveBeenCalled();
    expect(result).toEqual({
      layer: vectorLayer,
      interactiveNavaid: false,
      interactiveObstacle: true
    });
  });

  it("dispatches pmtiles+mvt with vectorLayerKind navaids to vector factory with interactiveNavaid", () => {
    const vectorLayer = { type: "vector" };
    const createVectorPmtilesLayer = vi.fn().mockReturnValue(vectorLayer);
    const createRasterPmtilesLayer = vi.fn();
    const createCustomZxyLayer = vi.fn();

    const result = createLayer(
      {
        layer: { tile: { scheme: "pmtiles", format: "mvt", vectorLayerKind: "navaids" } }
      },
      {
        createVectorPmtilesLayer,
        createRasterPmtilesLayer,
        createCustomZxyLayer
      }
    );

    expect(createVectorPmtilesLayer).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      layer: vectorLayer,
      interactiveNavaid: true,
      interactiveObstacle: false
    });
  });

  it("dispatches pmtiles raster formats to raster factory", () => {
    const rasterLayer = { type: "raster" };
    const createVectorPmtilesLayer = vi.fn();
    const createRasterPmtilesLayer = vi.fn().mockReturnValue(rasterLayer);
    const createCustomZxyLayer = vi.fn();

    const result = createLayer(
      {
        layer: { tile: { scheme: "pmtiles", format: "webp" } }
      },
      {
        createVectorPmtilesLayer,
        createRasterPmtilesLayer,
        createCustomZxyLayer
      }
    );

    expect(createVectorPmtilesLayer).not.toHaveBeenCalled();
    expect(createRasterPmtilesLayer).toHaveBeenCalledTimes(1);
    expect(createCustomZxyLayer).not.toHaveBeenCalled();
    expect(result).toEqual({ layer: rasterLayer, interactiveObstacle: false });
  });

  it("dispatches non-pmtiles layers to custom zxy factory", () => {
    const customLayer = { type: "custom-zxy" };
    const createVectorPmtilesLayer = vi.fn();
    const createRasterPmtilesLayer = vi.fn();
    const createCustomZxyLayer = vi.fn().mockReturnValue(customLayer);

    const result = createLayer(
      {
        layer: { tile: { scheme: "custom-zxy", format: "webp" } }
      },
      {
        createVectorPmtilesLayer,
        createRasterPmtilesLayer,
        createCustomZxyLayer
      }
    );

    expect(createVectorPmtilesLayer).not.toHaveBeenCalled();
    expect(createRasterPmtilesLayer).not.toHaveBeenCalled();
    expect(createCustomZxyLayer).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ layer: customLayer, interactiveObstacle: false });
  });
});
