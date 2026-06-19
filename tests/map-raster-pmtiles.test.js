import { describe, expect, it, vi } from "vitest";
import {
  createRasterPmtilesLoader,
  loadRasterPmtilesTile
} from "../src/map/layers/create-raster-pmtiles-layer";

function createMockResponse(data = new Uint8Array([1, 2, 3])) {
  return { data };
}

describe("raster pmtiles loader", () => {
  it("returns a transparent tile buffer when archive has no tile", async () => {
    const archive = {
      getZxy: vi.fn().mockResolvedValue(null)
    };

    const result = await loadRasterPmtilesTile({
      archive,
      archiveZoom: 4,
      x: 2,
      y: 3,
      tileSizePx: 8,
      mimeType: "image/webp"
    });

    expect(archive.getZxy).toHaveBeenCalledWith(4, 2, 3, undefined);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toHaveLength(8 * 8 * 4);
    expect(Array.from(result).every((value) => value === 0)).toBe(true);
  });

  it("uses mapped archive zoom and forwards abort signal", async () => {
    const archive = {
      getZxy: vi.fn().mockResolvedValue(null)
    };
    const signal = new AbortController().signal;

    const loader = createRasterPmtilesLoader({
      archive,
      zoomResolverPromise: Promise.resolve((localZoom) => localZoom + 5),
      tile: {
        tileSizePx: 16
      },
      mimeType: "image/webp"
    });

    await loader(1, 9, 10, { signal });

    expect(archive.getZxy).toHaveBeenCalledWith(6, 9, 10, signal);
  });

  it("uses createImageBitmap when available", async () => {
    const archive = {
      getZxy: vi.fn().mockResolvedValue(createMockResponse())
    };
    const imageBitmap = { kind: "bitmap" };
    const createImageBitmapFn = vi.fn().mockResolvedValue(imageBitmap);

    const result = await loadRasterPmtilesTile({
      archive,
      archiveZoom: 7,
      x: 1,
      y: 2,
      tileSizePx: 512,
      mimeType: "image/webp",
      createImageBitmapFn
    });

    expect(createImageBitmapFn).toHaveBeenCalledTimes(1);
    expect(result).toBe(imageBitmap);
  });

  it("falls back to Image decode and revokes object URL", async () => {
    const archive = {
      getZxy: vi.fn().mockResolvedValue(createMockResponse())
    };
    const createObjectUrl = vi.fn().mockReturnValue("blob:test-url");
    const revokeObjectUrl = vi.fn();

    const createImage = () => {
      const listeners = new Map();
      return {
        addEventListener: (eventName, handler) => {
          listeners.set(eventName, handler);
        },
        set src(value) {
          if (value === "blob:test-url") {
            queueMicrotask(() => {
              const load = listeners.get("load");
              if (load) {
                load();
              }
            });
          }
        }
      };
    };

    const image = await loadRasterPmtilesTile({
      archive,
      archiveZoom: 2,
      x: 3,
      y: 4,
      tileSizePx: 512,
      mimeType: "image/webp",
      createImageBitmapFn: null,
      createObjectUrl,
      revokeObjectUrl,
      createImage
    });

    expect(image).toBeTruthy();
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:test-url");
  });
});
