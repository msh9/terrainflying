import { describe, expect, it } from "vitest";
import { findForbiddenDistEntries } from "../scripts/dist-artifact-rules";

describe("dist artifact rules", () => {
  it("flags forbidden top-level directories and harness html files", () => {
    const violations = findForbiddenDistEntries([
      "assets/index-abc123.js",
      "fixtures/tiles/1/1/0.svg",
      "tiles/sectional/tiles.pmtiles",
      "tests/harness/main.js",
      "test-harness.html",
      "map-harness.html"
    ]);

    expect(violations).toEqual([
      "fixtures/tiles/1/1/0.svg",
      "map-harness.html",
      "test-harness.html",
      "tests/harness/main.js",
      "tiles/sectional/tiles.pmtiles"
    ]);
  });

  it("accepts app-only dist files", () => {
    const violations = findForbiddenDistEntries([
      "index.html",
      "assets/index-abc123.js",
      "assets/index-def456.css",
      "placeholder-slc.svg"
    ]);

    expect(violations).toEqual([]);
  });
});
