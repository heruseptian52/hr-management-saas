import { describe, expect, it } from "vitest";
import { generateMonthlySchedule } from "./scheduling";

describe("monthly scheduling engine", () => {
  it("creates one assignment per employee per day", () => expect(generateMonthlySchedule(2026, 9, [{ id: "a", monthlyDaysOff: 2 }, { id: "b", monthlyDaysOff: 4 }], ["pagi", "siang"]).length).toBe(60));
  it("respects individual monthly days off", () => {
    const result = generateMonthlySchedule(2026, 9, [{ id: "a", monthlyDaysOff: 2 }, { id: "b", monthlyDaysOff: 4 }], ["pagi"]);
    expect(result.filter(item => item.employeeId === "a" && item.type === "OFF")).toHaveLength(2);
    expect(result.filter(item => item.employeeId === "b" && item.type === "OFF")).toHaveLength(4);
  });
  it("requires at least one shift", () => expect(() => generateMonthlySchedule(2026, 9, [], [])).toThrow());
});
