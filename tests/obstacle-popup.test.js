import { describe, expect, it } from "vitest";
import { toObstaclePopupRows } from "../src/obstacle-popup";

describe("obstacle popup rows", () => {
  it("maps obstacle properties into popup rows", () => {
    const rows = toObstaclePopupRows({
      obstacle_type: "TOWER",
      heights: '{"agl":{"feet":40,"meters":12.192},"amsl":{"feet":2622,"meters":799.186}}',
      lighting: '{"code":"N","description":"Unlighted"}',
      vertical_accuracy: '{"code":"E","description":"+/- 125 ft","feet":125,"meters":38.1}'
    });

    expect(rows).toEqual([
      { label: "Type", value: "TOWER" },
      { label: "AGL", value: "40 ft / 12.192 m" },
      { label: "AMSL", value: "2622 ft / 799.186 m" },
      { label: "Lighting", value: "Unlighted" },
      {
        label: "Vertical Accuracy",
        value: "+/- 125 ft (125 ft / 38.1 m)"
      }
    ]);
  });

  it("falls back safely for missing or malformed fields", () => {
    const rows = toObstaclePopupRows({
      obstacle_type: "",
      heights: "not-json",
      lighting: "{}",
      vertical_accuracy: '{"description":"Unknown","feet":null,"meters":null}'
    });

    expect(rows).toEqual([
      { label: "Type", value: "Unknown" },
      { label: "AGL", value: "Unknown" },
      { label: "AMSL", value: "Unknown" },
      { label: "Lighting", value: "Unknown" },
      { label: "Vertical Accuracy", value: "Unknown" }
    ]);
  });
});
