import { describe, expect, it } from "vitest";
import { buildLayerVisibility, isLayerVisible } from "../src/map/layers/visibility";
import {
  getDisplayItems,
  getLayerUiLabel,
  getOptionalLayers,
  isGroupVisible
} from "../src/components/layer-panel/layer-visibility-ui";

describe("layer visibility helpers", () => {
  it("derives visibility defaults for optional and required layers", () => {
    const layers = [
      { id: "base", name: "Base", optional: false },
      { id: "tac", name: "TAC", optional: true, defaultVisible: true },
      { id: "weather", name: "Weather", optional: true }
    ];

    expect(buildLayerVisibility(layers)).toEqual({
      base: true,
      tac: true,
      weather: false
    });
  });

  it("resolves visibility and labels for optional layers", () => {
    const layers = [
      { id: "base", name: "Base", optional: false },
      { id: "tac", name: "TAC", optional: true, uiLabel: "Terminal" }
    ];
    const visibility = { tac: false };

    expect(getOptionalLayers(layers)).toHaveLength(1);
    expect(getLayerUiLabel(layers[1])).toBe("Terminal");
    expect(isLayerVisible(layers[1], visibility)).toBe(false);
  });
});

describe("getDisplayItems", () => {
  it("returns layer items for ungrouped optional layers", () => {
    const layers = [
      { id: "base", optional: false },
      { id: "tac", optional: true, uiLabel: "TAC" },
      { id: "weather", optional: true, uiLabel: "Weather" }
    ];

    const items = getDisplayItems(layers);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ type: "layer", layer: layers[1] });
    expect(items[1]).toEqual({ type: "layer", layer: layers[2] });
  });

  it("collapses grouped optional layers into a single group item", () => {
    const layers = [
      { id: "region-a", optional: true, groupId: "satellite", groupLabel: "Satellite Imagery" },
      { id: "region-b", optional: true, groupId: "satellite", groupLabel: "Satellite Imagery" },
      { id: "region-c", optional: true, groupId: "satellite", groupLabel: "Satellite Imagery" }
    ];

    const items = getDisplayItems(layers);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "group",
      groupId: "satellite",
      groupLabel: "Satellite Imagery",
      memberIds: ["region-a", "region-b", "region-c"]
    });
  });

  it("falls back to groupId when groupLabel is absent", () => {
    const layers = [
      { id: "region-a", optional: true, groupId: "satellite" },
      { id: "region-b", optional: true, groupId: "satellite" }
    ];

    const items = getDisplayItems(layers);
    expect(items[0].groupLabel).toBe("satellite");
  });

  it("uses the first layer's groupLabel for the group", () => {
    const layers = [
      { id: "a", optional: true, groupId: "g", groupLabel: "First Label" },
      { id: "b", optional: true, groupId: "g", groupLabel: "Second Label" }
    ];

    const items = getDisplayItems(layers);
    expect(items[0].groupLabel).toBe("First Label");
  });

  it("mixes grouped and ungrouped layers preserving insertion order", () => {
    const layers = [
      { id: "solo", optional: true, uiLabel: "Solo" },
      { id: "a", optional: true, groupId: "grp", groupLabel: "Group" },
      { id: "b", optional: true, groupId: "grp", groupLabel: "Group" }
    ];

    const items = getDisplayItems(layers);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ type: "layer", layer: layers[0] });
    expect(items[1].type).toBe("group");
    expect(items[1].memberIds).toEqual(["a", "b"]);
  });

  it("excludes non-optional layers from display items", () => {
    const layers = [
      { id: "base", optional: false, groupId: "grp", groupLabel: "Group" },
      { id: "overlay", optional: true, groupId: "grp", groupLabel: "Group" }
    ];

    const items = getDisplayItems(layers);
    expect(items).toHaveLength(1);
    expect(items[0].memberIds).toEqual(["overlay"]);
  });

  it("handles an empty layers array", () => {
    expect(getDisplayItems([])).toEqual([]);
  });
});

describe("isGroupVisible", () => {
  it("returns true when any member is visible", () => {
    const visibility = { a: false, b: true, c: false };
    expect(isGroupVisible(["a", "b", "c"], visibility)).toBe(true);
  });

  it("returns false when all members are hidden", () => {
    const visibility = { a: false, b: false };
    expect(isGroupVisible(["a", "b"], visibility)).toBe(false);
  });

  it("returns false when memberIds is empty", () => {
    expect(isGroupVisible([], { a: true })).toBe(false);
  });

  it("uses defaultVisible=false for members missing from visibility map", () => {
    expect(isGroupVisible(["unknown"], {})).toBe(false);
  });
});
