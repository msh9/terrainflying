import { describe, expect, it } from "vitest";
import { createArchiveZoomResolver } from "../src/map/layers/pmtiles-zoom-resolver";

describe("pmtiles helpers", () => {
  it("prefers manifest zoom mapping over metadata mapping", () => {
    const tile = {
      archiveZoomByLocalZoom: { 0: 6, 1: 7 },
      archiveZoomOffset: 3
    };
    const metadata = {
      localZoomToPmtilesZoom: { 0: 5, 1: 6 },
      pmtilesZoomOffset: 1
    };

    const resolveZoom = createArchiveZoomResolver(tile, metadata);
    expect(resolveZoom(0)).toBe(6);
    expect(resolveZoom(1)).toBe(7);
    expect(resolveZoom(2)).toBe(5);
  });

  it("falls back to metadata offset when explicit mapping is absent", () => {
    const resolveZoom = createArchiveZoomResolver({}, { pmtilesZoomOffset: 4 });
    expect(resolveZoom(0)).toBe(4);
    expect(resolveZoom(3)).toBe(7);
  });

  it("supports a caller-provided default offset when no explicit offsets exist", () => {
    const resolveZoom = createArchiveZoomResolver(
      { archiveMinZoom: 2, archiveMaxZoom: 9 },
      {},
      { defaultOffset: 2 }
    );
    expect(resolveZoom(0)).toBe(2);
    expect(resolveZoom(4)).toBe(6);
  });

  it("clamps resolved archive zoom to archive bounds", () => {
    const resolveZoom = createArchiveZoomResolver(
      { archiveMinZoom: 2, archiveMaxZoom: 5, archiveZoomOffset: 2 },
      {}
    );
    expect(resolveZoom(0)).toBe(2);
    expect(resolveZoom(2)).toBe(4);
    expect(resolveZoom(8)).toBe(5);
  });
});
