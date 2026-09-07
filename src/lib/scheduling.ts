export type ScheduleEmployee = {
  id: string;
  monthlyDaysOff: number;
  allowedShiftIds?: string[];
  forbiddenOffWeekdays?: number[];
};
export type GeneratedAssignment = { employeeId: string; day: number; shiftId: string | null; type: "WORK" | "OFF" };
export type RotationMode = "DAILY" | "WEEKLY" | "FIXED";

function spreadOffDays(year: number, month: number, count: number, employeeIndex: number, forbiddenWeekdays: Set<number>) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const candidates = Array.from({ length: days }, (_, index) => index + 1)
    .filter(day => !forbiddenWeekdays.has(new Date(Date.UTC(year, month - 1, day)).getUTCDay()));
  const wanted = Math.min(Math.max(0, count), candidates.length);
  const selected = new Set<number>();
  for (let index = 0; index < wanted; index++) {
    const offset = Math.floor(((index + 0.5) * candidates.length) / wanted + employeeIndex) % candidates.length;
    selected.add(candidates[offset]);
  }
  return selected;
}

export function generateMonthlySchedule(year: number, month: number, employees: ScheduleEmployee[], shiftIds: string[], rotation: RotationMode = "DAILY") {
  if (!Number.isInteger(year) || month < 1 || month > 12) throw new Error("Invalid month");
  if (shiftIds.length === 0) throw new Error("At least one shift is required");
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result: GeneratedAssignment[] = [];
  employees.forEach((employee, employeeIndex) => {
    const employeeShifts = employee.allowedShiftIds?.length ? employee.allowedShiftIds : shiftIds;
    if (!employeeShifts.length) throw new Error(`No allowed shift for employee ${employee.id}`);
    const forbidden = new Set(employee.forbiddenOffWeekdays ?? []);
    const offDays = spreadOffDays(year, month, employee.monthlyDaysOff, employeeIndex, forbidden);
    for (let day = 1; day <= days; day++) {
      const off = offDays.has(day);
      const shiftIndex = rotation === "FIXED" ? employeeIndex : rotation === "WEEKLY" ? Math.floor((day - 1) / 7) + employeeIndex : day - 1 + employeeIndex;
      result.push({ employeeId: employee.id, day, type: off ? "OFF" : "WORK", shiftId: off ? null : employeeShifts[shiftIndex % employeeShifts.length] });
    }
  });
  return result;
}
