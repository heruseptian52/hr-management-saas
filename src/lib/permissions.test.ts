import { describe, expect, it } from "vitest";
import { hasPermission, ownerPermissions } from "./permissions";

describe("RBAC permissions", () => {
  it("allows configured actions", () => expect(hasPermission(ownerPermissions, "employees", "export")).toBe(true));
  it("denies unknown modules", () => expect(hasPermission(ownerPermissions, "payroll", "view")).toBe(false));
  it("does not treat delete as a wildcard", () => expect(hasPermission({ employees: ["delete"] }, "employees", "approve")).toBe(false));
  it("denies malformed permissions", () => expect(hasPermission(null, "employees", "view")).toBe(false));
});
