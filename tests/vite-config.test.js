// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

describe("index html manifest config", () => {
  it("uses vite html constant replacement for manifest url", () => {
    const indexHtmlPath = path.resolve(TEST_DIR, "..", "index.html");
    const indexHtml = readFileSync(indexHtmlPath, "utf8");

    expect(indexHtml).toContain('name="flyer-manifest-url"');
    expect(indexHtml).toContain('content="%VITE_MANIFEST_URL%"');
  });
});
