import { describe, expect, it } from "vitest";
import { parseByteRange } from "../scripts/http-range";

describe("parseByteRange", () => {
  it("returns undefined when no range header is provided", () => {
    expect(parseByteRange(undefined, 1000)).toBeUndefined();
    expect(parseByteRange("", 1000)).toBeUndefined();
  });

  it("parses explicit byte ranges", () => {
    expect(parseByteRange("bytes=0-511", 1000)).toEqual({
      start: 0,
      end: 511
    });
    expect(parseByteRange("bytes=512-", 1000)).toEqual({
      start: 512,
      end: 999
    });
  });

  it("parses suffix byte ranges", () => {
    expect(parseByteRange("bytes=-100", 1000)).toEqual({
      start: 900,
      end: 999
    });
    expect(parseByteRange("bytes=-5000", 1000)).toEqual({
      start: 0,
      end: 999
    });
  });

  it("returns null for invalid ranges", () => {
    expect(parseByteRange("bytes=900-100", 1000)).toBeNull();
    expect(parseByteRange("bytes=1000-1200", 1000)).toBeNull();
    expect(parseByteRange("bytes=-0", 1000)).toBeNull();
    expect(parseByteRange("bytes=abc-def", 1000)).toBeNull();
    expect(parseByteRange("items=0-10", 1000)).toBeNull();
  });
});
