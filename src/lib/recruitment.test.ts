import { describe, expect, it } from "vitest";
import { normalizeIdentity, optionalDate, optionalText, stageLabels, tenantRecord } from "./recruitment";

describe("recruitment helpers", () => {
  it("keeps empty optional fields empty", () => expect(optionalText("  ")).toBeNull());
  it("normalizes identity as a string", () => expect(normalizeIdentity("6472-0461-0206-0001")).toBe("6472046102060001"));
  it("parses safe ISO dates", () => expect(optionalDate("2026-09-15")?.toISOString()).toBe("2026-09-15T00:00:00.000Z"));
  it("rejects invalid dates", () => expect(() => optionalDate("invalid")).toThrow("DATE"));
  it("has an Indonesian label for every workflow stage", () => expect(stageLabels.HIRED).toBe("Diterima"));
  it("always creates a company-scoped record selector", () => expect(tenantRecord("company-a", "candidate-1")).toEqual({ id: "candidate-1", companyId: "company-a", deletedAt: null }));
  it("rejects an incomplete tenant selector", () => expect(() => tenantRecord("", "candidate-1")).toThrow("TENANT_SCOPE"));
});
