// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

describe("responsive style contracts", () => {
  it("defines a two-column header with cursor truncation fallback", () => {
    const stylesPath = path.resolve(TEST_DIR, "..", "src", "styles.css");
    const styles = readFileSync(stylesPath, "utf8");

    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 240px);");
    expect(styles).toContain("text-overflow: ellipsis;");
    expect(styles).toContain("white-space: nowrap;");
  });
});
