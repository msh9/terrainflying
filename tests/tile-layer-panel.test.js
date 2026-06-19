import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/components/tile-layer-panel";

function mountLayerPanel({ layers, layerVisibility }) {
  const panel = document.createElement("tile-layer-panel");
  panel.layers = layers;
  panel.layerVisibility = layerVisibility;
  panel.rotationText = "0.0 deg";
  panel.autoRotateEnabled = false;
  document.body.append(panel);
  return panel;
}

describe("tile-layer-panel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders rotation controls even when no optional layers exist", async () => {
    const panel = mountLayerPanel({
      layers: [{ id: "base", name: "Base", optional: false }],
      layerVisibility: { base: true }
    });

    await panel.updateComplete;
    expect(panel.querySelector(".layer-panel-shell")).not.toBeNull();
    expect(panel.querySelector("[data-role='rotation-minus']")).not.toBeNull();
    expect(panel.querySelector(".layer-panel-section")).toBeNull();
  });

  it("opens and closes the mobile panel with trigger, backdrop, and escape", async () => {
    const panel = mountLayerPanel({
      layers: [{ id: "tac", name: "TAC", optional: true, defaultVisible: true }],
      layerVisibility: { tac: true }
    });

    await panel.updateComplete;
    const trigger = panel.querySelector("[data-role='layer-panel-toggle']");
    const sheet = panel.querySelector(".layer-panel");
    const backdrop = panel.querySelector("[data-role='layer-panel-backdrop']");
    const closeButton = panel.querySelector("[data-role='layer-panel-close']");

    expect(trigger).not.toBeNull();
    expect(sheet).not.toBeNull();
    expect(backdrop).not.toBeNull();
    expect(closeButton).not.toBeNull();

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(sheet.getAttribute("data-open")).toBe("false");

    trigger.click();
    await panel.updateComplete;
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(sheet.getAttribute("data-open")).toBe("true");

    closeButton.click();
    await panel.updateComplete;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.click();
    await panel.updateComplete;
    backdrop.click();
    await panel.updateComplete;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.click();
    await panel.updateComplete;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await panel.updateComplete;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("emits layer-toggle events when a checkbox changes", async () => {
    const panel = mountLayerPanel({
      layers: [{ id: "tac", name: "TAC", optional: true, defaultVisible: true }],
      layerVisibility: { tac: true }
    });
    const onLayerToggle = vi.fn();
    panel.addEventListener("layer-toggle", onLayerToggle);

    await panel.updateComplete;
    const tacToggle = panel.querySelector("input[data-layer-id='tac']");
    tacToggle.checked = false;
    tacToggle.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onLayerToggle).toHaveBeenCalledTimes(1);
    expect(onLayerToggle.mock.calls[0][0].detail).toEqual({
      layerId: "tac",
      visible: false
    });
  });

  it("renders effectiveDate from layer.release when present", async () => {
    const panel = mountLayerPanel({
      layers: [
        {
          id: "tac",
          name: "TAC",
          optional: true,
          defaultVisible: true,
          release: { effectiveDate: "2025-01-23" }
        }
      ],
      layerVisibility: { tac: true }
    });

    await panel.updateComplete;
    const dateEl = panel.querySelector(".layer-toggle__date");
    expect(dateEl).not.toBeNull();
    expect(dateEl.textContent).toContain("2025-01-23");
  });

  it("does not render a date element when release is absent", async () => {
    const panel = mountLayerPanel({
      layers: [{ id: "tac", name: "TAC", optional: true, defaultVisible: true }],
      layerVisibility: { tac: true }
    });

    await panel.updateComplete;
    const dateEl = panel.querySelector(".layer-toggle__date");
    expect(dateEl).toBeNull();
  });

  it("bubbles rotation control events from the options panel", async () => {
    const panel = mountLayerPanel({
      layers: [{ id: "base", name: "Base", optional: false }],
      layerVisibility: { base: true }
    });
    const onRotateStep = vi.fn();
    const onRotateReset = vi.fn();
    const onAutoRotate = vi.fn();
    panel.addEventListener("rotate-step", onRotateStep);
    panel.addEventListener("rotate-reset", onRotateReset);
    panel.addEventListener("auto-rotate-toggle", onAutoRotate);

    await panel.updateComplete;

    panel.querySelector("[data-role='rotation-minus']").click();
    panel.querySelector("[data-role='rotation-reset']").click();
    const autoRotate = panel.querySelector("[data-role='rotation-auto']");
    autoRotate.checked = true;
    autoRotate.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onRotateStep).toHaveBeenCalledTimes(1);
    expect(onRotateReset).toHaveBeenCalledTimes(1);
    expect(onAutoRotate).toHaveBeenCalledTimes(1);
    expect(onRotateStep.mock.calls[0][0].detail.deltaDegrees).toBeTypeOf("number");
    expect(onAutoRotate.mock.calls[0][0].detail).toEqual({ enabled: true });
  });
});

describe("tile-layer-panel — layer groups", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function makeGroupedLayers() {
    return [
      {
        id: "region-a",
        name: "Region A",
        optional: true,
        defaultVisible: false,
        groupId: "satellite",
        groupLabel: "Satellite Imagery"
      },
      {
        id: "region-b",
        name: "Region B",
        optional: true,
        defaultVisible: false,
        groupId: "satellite",
        groupLabel: "Satellite Imagery"
      },
      {
        id: "region-c",
        name: "Region C",
        optional: true,
        defaultVisible: false,
        groupId: "satellite",
        groupLabel: "Satellite Imagery"
      }
    ];
  }

  it("renders one checkbox for a group of layers instead of one per layer", async () => {
    const layers = makeGroupedLayers();
    const panel = mountLayerPanel({
      layers,
      layerVisibility: { "region-a": false, "region-b": false, "region-c": false }
    });

    await panel.updateComplete;

    const groupCheckbox = panel.querySelector("input[data-group-id='satellite']");
    const individualCheckboxes = panel.querySelectorAll("input[data-layer-id]");

    expect(groupCheckbox).not.toBeNull();
    expect(individualCheckboxes).toHaveLength(0);
    // only the group checkbox plus any rotation controls (no layer-id checkboxes)
    expect(panel.querySelector("input[data-layer-id='region-a']")).toBeNull();
  });

  it("renders the groupLabel as the checkbox label", async () => {
    const layers = makeGroupedLayers();
    const panel = mountLayerPanel({
      layers,
      layerVisibility: { "region-a": false, "region-b": false, "region-c": false }
    });

    await panel.updateComplete;

    const label = panel.querySelector(".layer-toggle span");
    expect(label?.textContent?.trim()).toBe("Satellite Imagery");
  });

  it("group checkbox is unchecked when all members are hidden", async () => {
    const layers = makeGroupedLayers();
    const panel = mountLayerPanel({
      layers,
      layerVisibility: { "region-a": false, "region-b": false, "region-c": false }
    });

    await panel.updateComplete;

    const groupCheckbox = panel.querySelector("input[data-group-id='satellite']");
    expect(groupCheckbox.checked).toBe(false);
  });

  it("group checkbox is checked when any member is visible", async () => {
    const layers = makeGroupedLayers();
    const panel = mountLayerPanel({
      layers,
      layerVisibility: { "region-a": true, "region-b": false, "region-c": false }
    });

    await panel.updateComplete;

    const groupCheckbox = panel.querySelector("input[data-group-id='satellite']");
    expect(groupCheckbox.checked).toBe(true);
  });

  it("toggling the group checkbox fires a layer-toggle event for each member", async () => {
    const layers = makeGroupedLayers();
    const panel = mountLayerPanel({
      layers,
      layerVisibility: { "region-a": false, "region-b": false, "region-c": false }
    });
    const onLayerToggle = vi.fn();
    panel.addEventListener("layer-toggle", onLayerToggle);

    await panel.updateComplete;

    const groupCheckbox = panel.querySelector("input[data-group-id='satellite']");
    groupCheckbox.checked = true;
    groupCheckbox.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onLayerToggle).toHaveBeenCalledTimes(3);
    const firedIds = onLayerToggle.mock.calls.map((c) => c[0].detail.layerId);
    expect(firedIds).toContain("region-a");
    expect(firedIds).toContain("region-b");
    expect(firedIds).toContain("region-c");
    onLayerToggle.mock.calls.forEach((c) => {
      expect(c[0].detail.visible).toBe(true);
    });
  });

  it("toggling off fires layer-toggle with visible=false for all members", async () => {
    const layers = makeGroupedLayers();
    const panel = mountLayerPanel({
      layers,
      layerVisibility: { "region-a": true, "region-b": true, "region-c": true }
    });
    const onLayerToggle = vi.fn();
    panel.addEventListener("layer-toggle", onLayerToggle);

    await panel.updateComplete;

    const groupCheckbox = panel.querySelector("input[data-group-id='satellite']");
    groupCheckbox.checked = false;
    groupCheckbox.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onLayerToggle).toHaveBeenCalledTimes(3);
    onLayerToggle.mock.calls.forEach((c) => {
      expect(c[0].detail.visible).toBe(false);
    });
  });

  it("renders a mix of grouped and ungrouped layers correctly", async () => {
    const layers = [
      { id: "tac", name: "TAC", optional: true, defaultVisible: true },
      {
        id: "region-a",
        name: "Region A",
        optional: true,
        groupId: "satellite",
        groupLabel: "Satellite Imagery"
      },
      {
        id: "region-b",
        name: "Region B",
        optional: true,
        groupId: "satellite",
        groupLabel: "Satellite Imagery"
      }
    ];
    const panel = mountLayerPanel({
      layers,
      layerVisibility: { tac: true, "region-a": false, "region-b": false }
    });

    await panel.updateComplete;

    expect(panel.querySelector("input[data-layer-id='tac']")).not.toBeNull();
    expect(panel.querySelector("input[data-group-id='satellite']")).not.toBeNull();
    expect(panel.querySelector("input[data-layer-id='region-a']")).toBeNull();
    expect(panel.querySelector("input[data-layer-id='region-b']")).toBeNull();
  });
});
