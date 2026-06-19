import { describe, expect, it } from "vitest";
import { formatRotation } from "../src/format";

const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

describe("formatRotation", () => {
  it("formats signed degrees within -180 to 180", () => {
    expect(formatRotation(0)).toBe("0.0 deg");
    expect(formatRotation(degreesToRadians(190))).toBe("-170.0 deg");
    expect(formatRotation(degreesToRadians(-190))).toBe("170.0 deg");
    expect(formatRotation(degreesToRadians(180))).toBe("180.0 deg");
    expect(formatRotation(degreesToRadians(-180))).toBe("-180.0 deg");
  });
});
