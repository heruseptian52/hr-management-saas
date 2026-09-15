import { describe, expect, it } from "vitest";
import { disciplineDate, disciplineSeverities, tenantDisciplineRecord } from "./discipline";
describe("discipline helpers", () => {
  it("supports SP1 through SP3", () => expect(disciplineSeverities).toContain("SP3"));
  it("parses an exact incident date", () => expect(disciplineDate("2026-09-15")?.toISOString()).toBe("2026-09-15T00:00:00.000Z"));
  it("allows an optional empty date", () => expect(disciplineDate("", true)).toBeNull());
  it("rejects impossible dates", () => expect(() => disciplineDate("2026-02-31")).toThrow("DATE"));
  it("requires company-scoped selectors", () => expect(tenantDisciplineRecord("company-a", "case-1")).toEqual({ id: "case-1", companyId: "company-a", deletedAt: null }));
});
