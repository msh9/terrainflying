import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../src/app";

function createMatchMediaResult(matches) {
  return {
    matches,
    media: "(hover: none), (pointer: coarse)",
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    }
  };
}

function dispatchPointerMove(pointerType) {
  const event = new Event("pointermove", { bubbles: true });
  Object.defineProperty(event, "pointerType", {
    value: pointerType
  });
  window.dispatchEvent(event);
}

describe("cursor visibility by input mode", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    document.body.innerHTML = "";
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      delete window.matchMedia;
    }
  });

  it("hides cursor readout when touch/coarse input is detected", async () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMatchMediaResult(true));

    const root = document.createElement("div");
    document.body.append(root);
    const app = renderApp(root, { autoLoad: false, mapEnabled: false });

    await app.updateComplete;
    expect(app.querySelector("[data-role='cursor-value']")).toBeNull();
  });

  it("restores cursor readout after a mouse pointer move on hybrid devices", async () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMatchMediaResult(true));

    const root = document.createElement("div");
    document.body.append(root);
    const app = renderApp(root, { autoLoad: false, mapEnabled: false });

    await app.updateComplete;
    expect(app.querySelector("[data-role='cursor-value']")).toBeNull();

    dispatchPointerMove("mouse");
    await app.updateComplete;
    expect(app.querySelector("[data-role='cursor-value']")).not.toBeNull();
  });
});
