import { describe, expect, it } from "vitest";
import { autoRotationDeltaRadians, bearingRadians, normalizeAngleRadians } from "../src/rotation";

const TWO_PI = Math.PI * 2;

describe("rotation helpers", () => {
  it("normalizes angles to [-pi, pi]", () => {
    expect(normalizeAngleRadians(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngleRadians(-Math.PI * 3)).toBeCloseTo(-Math.PI);
    expect(normalizeAngleRadians(TWO_PI)).toBeCloseTo(0);
  });

  it("computes bearings on a sphere", () => {
    const north = bearingRadians([0, 0], [0, 1]);
    const east = bearingRadians([0, 0], [1, 0]);
    expect(north).toBeCloseTo(0);
    expect(east).toBeCloseTo(Math.PI / 2);
  });

  it("computes auto rotation delta from bearings", () => {
    const delta = autoRotationDeltaRadians(0, Math.PI / 2);
    expect(delta).toBeCloseTo(Math.PI / 2);
  });
});
