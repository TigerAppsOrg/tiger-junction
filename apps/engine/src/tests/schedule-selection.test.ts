import { describe, expect, test } from "bun:test";
import { isSectionSelected } from "../mcp/schedule-selection.js";

describe("ReCal section selections", () => {
  test("only actual confirms are selected, not available section categories", () => {
    const metadata = { sections: ["L", "P"], confirms: { L: "L01", P: "P02" } };
    expect(isSectionSelected(metadata, "L01")).toBe(true);
    expect(isSectionSelected(metadata, "P02")).toBe(true);
    expect(isSectionSelected(metadata, "P01")).toBe(false);
  });
  test("no picks means no selected slots", () => {
    for (const metadata of [null, {}, { confirms: {} }, { confirms: [] }, { confirms: { L: null } }]) {
      expect(isSectionSelected(metadata, "L01")).toBe(false);
    }
  });
});
