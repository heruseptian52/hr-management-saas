import { describe, expect, it } from "vitest";
import { safeCsvCell, toCsv } from "./csv";

describe("CSV export", () => {
  it("escapes quotes", () => expect(safeCsvCell('A "test"')).toBe('"A ""test"""'));
  it("prevents spreadsheet formula injection", () => expect(safeCsvCell("=1+1")).toBe('"\'=1+1"'));
  it("creates rows", () => expect(toCsv([["a", "b"], [1, 2]])).toContain("\r\n"));
});

