import { describe, expect, it } from "vitest";
import {
  formatHoldCountdown,
  distanceGeodesic,
  distanceSpherical,
  formatKilometers,
  formatMeasurementLines,
  formatKilometersAndNauticalMiles,
  toNauticalMiles
} from "../src/measure";

const EARTH_RADIUS = 6371008.8;

describe("measurement distance helpers", () => {
  it("formats kilometers with two decimals", () => {
    expect(formatKilometers(0)).toBe("0.00 km");
    expect(formatKilometers(1234.567)).toBe("1.23 km");
  });

  it("converts meters to nautical miles", () => {
    expect(toNauticalMiles(0)).toBe(0);
    expect(toNauticalMiles(1852)).toBe(1);
    expect(toNauticalMiles(3704)).toBe(2);
  });

  it("formats kilometers and nautical miles together", () => {
    expect(formatKilometersAndNauticalMiles(1852)).toBe("1.85 km (1.00 NM)");
    expect(formatKilometersAndNauticalMiles(5556)).toBe("5.56 km (3.00 NM)");
  });

  it("formats hold countdown text", () => {
    expect(formatHoldCountdown(2000)).toBe("Hold 2.0s to measure");
    expect(formatHoldCountdown(1250)).toBe("Hold 1.3s to measure");
    expect(formatHoldCountdown(920)).toBe("Hold 0.9s to measure");
    expect(formatHoldCountdown(0)).toBe("Hold 0.0s to measure");
  });

  it("computes spherical distance using WGS84 lon/lat", () => {
    const expected = (2 * Math.PI * EARTH_RADIUS) / 360;
    const distance = distanceSpherical([0, 0], [1, 0]);
    expect(distance).toBeCloseTo(expected, 0);
  });

  it("computes geodesic distance using WGS84 lon/lat", () => {
    const distance = distanceGeodesic([0, 0], [0, 1]);
    expect(distance).toBeGreaterThan(110000);
    expect(distance).toBeLessThan(111000);
  });

  it("formats total and per-segment measurement output", () => {
    expect(
      formatMeasurementLines([
        { geodesic: 1852, spherical: 2000 },
        { geodesic: 3704, spherical: 4000 }
      ])
    ).toEqual([
      "Total",
      "Geodesic: 5.56 km (3.00 NM)",
      "Spherical: 6.00 km (3.24 NM)",
      "Segment 1",
      "Geodesic: 1.85 km (1.00 NM)",
      "Spherical: 2.00 km (1.08 NM)",
      "Segment 2",
      "Geodesic: 3.70 km (2.00 NM)",
      "Spherical: 4.00 km (2.16 NM)"
    ]);
  });
});
