import { describe, expect, it } from "vitest";
import { toNavaidPopupRows } from "../src/navaid-popup";

describe("navaid popup rows", () => {
  it("formats VOR_DME with mhz and channel", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "VOR_DME",
      designator: "ORL",
      name: "ORLANDO",
      frequency: '{"mhz":116.8,"channel":"115X"}',
      navaid_status: "OPERATIONAL IFR"
    });

    expect(rows).toEqual([
      { label: "Type", value: "VOR/DME" },
      { label: "Ident", value: "ORL" },
      { label: "Name", value: "ORLANDO" },
      { label: "Frequency", value: "116.8 MHz / 115X" }
    ]);
  });

  it("formats NDB with mhz using kHz label", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "NDB",
      designator: "LFV",
      name: "LUFKIN",
      frequency: '{"mhz":403}',
      navaid_status: "OPERATIONAL IFR"
    });

    expect(rows).toEqual([
      { label: "Type", value: "NDB" },
      { label: "Ident", value: "LFV" },
      { label: "Name", value: "LUFKIN" },
      { label: "Frequency", value: "403 kHz" }
    ]);
  });

  it("formats TACAN with channel only", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "TACAN",
      designator: "TCC",
      name: "TUCUMCARI",
      frequency: '{"channel":"77X"}',
      navaid_status: "OPERATIONAL IFR"
    });

    expect(rows).toEqual([
      { label: "Type", value: "TACAN" },
      { label: "Ident", value: "TCC" },
      { label: "Name", value: "TUCUMCARI" },
      { label: "Frequency", value: "77X" }
    ]);
  });

  it("formats DME with channel only", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "DME",
      designator: "ABC",
      name: "SOME DME",
      frequency: '{"channel":"77X"}',
      navaid_status: "OPERATIONAL IFR"
    });

    expect(rows).toEqual([
      { label: "Type", value: "DME" },
      { label: "Ident", value: "ABC" },
      { label: "Name", value: "SOME DME" },
      { label: "Frequency", value: "77X" }
    ]);
  });

  it("shows dash when frequency field is missing", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "VOR",
      designator: "XYZ",
      name: "SOME VOR",
      navaid_status: "OPERATIONAL IFR"
    });

    expect(rows).toEqual([
      { label: "Type", value: "VOR" },
      { label: "Ident", value: "XYZ" },
      { label: "Name", value: "SOME VOR" },
      { label: "Frequency", value: "—" }
    ]);
  });

  it("omits status row when status is OPERATIONAL IFR", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "VOR",
      designator: "ABC",
      name: "TEST VOR",
      frequency: '{"mhz":112.2}',
      navaid_status: "OPERATIONAL IFR"
    });

    expect(rows.find((r) => r.label === "Status")).toBeUndefined();
  });

  it("includes status row when status is not OPERATIONAL IFR", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "VOR",
      designator: "ABC",
      name: "TEST VOR",
      frequency: '{"mhz":112.2}',
      navaid_status: "DECOMMISSIONED"
    });

    expect(rows.find((r) => r.label === "Status")).toEqual({
      label: "Status",
      value: "DECOMMISSIONED"
    });
  });

  it("falls back safely for missing or malformed fields", () => {
    const rows = toNavaidPopupRows({
      navaid_type: "",
      frequency: "not-json"
    });

    expect(rows).toEqual([
      { label: "Type", value: "Unknown" },
      { label: "Ident", value: "Unknown" },
      { label: "Name", value: "Unknown" },
      { label: "Frequency", value: "—" }
    ]);
  });

  it("falls back safely for empty properties", () => {
    const rows = toNavaidPopupRows({});

    expect(rows).toEqual([
      { label: "Type", value: "Unknown" },
      { label: "Ident", value: "Unknown" },
      { label: "Name", value: "Unknown" },
      { label: "Frequency", value: "—" }
    ]);
  });
});
