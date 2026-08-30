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
  it("supports weekly rotation", () => {
    const result = generateMonthlySchedule(2026, 9, [{ id: "a", monthlyDaysOff: 0 }], ["pagi", "malam"], "WEEKLY");
    expect(result.find(item => item.day === 1)?.shiftId).toBe("pagi");
    expect(result.find(item => item.day === 7)?.shiftId).toBe("pagi");
    expect(result.find(item => item.day === 8)?.shiftId).toBe("malam");
  });
  it("supports a fixed shift per employee", () => {
    const result = generateMonthlySchedule(2026, 9, [{ id: "a", monthlyDaysOff: 0 }], ["pagi", "malam"], "FIXED");
    expect(new Set(result.map(item => item.shiftId))).toEqual(new Set(["pagi"]));
  });
});
