import { describe, expect, it } from "vitest";
import { parseTrainingDate, tenantTrainingRecord, validateTrainingRange } from "./training";

describe("training helpers", () => {
  it("parses exact dates", () => expect(parseTrainingDate("2026-09-15").toISOString()).toBe("2026-09-15T00:00:00.000Z"));
  it("rejects impossible dates", () => expect(() => parseTrainingDate("2026-02-31")).toThrow("DATE"));
  it("rejects an inverted period", () => expect(() => validateTrainingRange(new Date("2026-09-16"), new Date("2026-09-15"))).toThrow("DATE_RANGE"));
  it("scopes every record to its company", () => expect(tenantTrainingRecord("company-a", "training-1")).toEqual({ id: "training-1", companyId: "company-a", deletedAt: null }));
});
