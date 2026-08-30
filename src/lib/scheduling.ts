export type ScheduleEmployee = { id: string; monthlyDaysOff: number };
export type GeneratedAssignment = { employeeId: string; day: number; shiftId: string | null; type: "WORK" | "OFF" };
export type RotationMode = "DAILY" | "WEEKLY" | "FIXED";

export function generateMonthlySchedule(year: number, month: number, employees: ScheduleEmployee[], shiftIds: string[], rotation: RotationMode = "DAILY") {
  if (!Number.isInteger(year) || month < 1 || month > 12) throw new Error("Invalid month");
  if (shiftIds.length === 0) throw new Error("At least one shift is required");
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result: GeneratedAssignment[] = [];
  employees.forEach((employee, employeeIndex) => {
    const offCount = Math.min(days, Math.max(0, employee.monthlyDaysOff));
    const offDays = new Set<number>();
    for (let index = 0; index < offCount; index++) offDays.add(1 + Math.floor(((index + 0.5) * days) / offCount + employeeIndex) % days);
    for (let day = 1; day <= days; day++) {
      const off = offDays.has(day);
      const shiftIndex = rotation === "FIXED" ? employeeIndex : rotation === "WEEKLY" ? Math.floor((day - 1) / 7) + employeeIndex : day - 1 + employeeIndex;
      result.push({ employeeId: employee.id, day, type: off ? "OFF" : "WORK", shiftId: off ? null : shiftIds[shiftIndex % shiftIds.length] });
    }
  });
  return result;
}
