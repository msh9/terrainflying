import { describe, expect, it } from "vitest";
import { buildLayerAttribution } from "../src/manifest/release-attribution.js";

const BASE = "Federal Aviation Administration";

describe("buildLayerAttribution", () => {
  it("returns original attribution when release is absent", () => {
    expect(buildLayerAttribution({ attribution: BASE })).toBe(BASE);
  });

  it("appends effectiveDate with 'eff.' prefix", () => {
    const layer = { attribution: BASE, release: { effectiveDate: "2025-01-23" } };
    expect(buildLayerAttribution(layer)).toBe(`${BASE} · eff. 2025-01-23`);
  });

  it("appends dataCutDate with 'data through' prefix when effectiveDate is absent", () => {
    const layer = { attribution: BASE, release: { dataCutDate: "2025-01-01" } };
    expect(buildLayerAttribution(layer)).toBe(`${BASE} · data through 2025-01-01`);
  });

  it("appends dataWindow as a date range when effectiveDate is absent", () => {
    const layer = {
      attribution: BASE,
      release: { dataWindow: { start: "2024-07-01", end: "2025-01-01" } }
    };
    expect(buildLayerAttribution(layer)).toBe(`${BASE} · 2024-07-01 to 2025-01-01`);
  });

  it("effectiveDate takes priority when all three fields are present", () => {
    const layer = {
      attribution: BASE,
      release: {
        effectiveDate: "2025-01-23",
        dataCutDate: "2025-01-01",
        dataWindow: { start: "2024-07-01", end: "2025-01-01" }
      }
    };
    expect(buildLayerAttribution(layer)).toBe(`${BASE} · eff. 2025-01-23`);
  });

  it("returns original attribution when release has no matching date fields", () => {
    const layer = { attribution: BASE, release: {} };
    expect(buildLayerAttribution(layer)).toBe(BASE);
  });
});
