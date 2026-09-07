import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  scheduleId: z.string().cuid(), employeeId: z.string().cuid().or(z.literal("ALL")),
  shiftId: z.string().cuid().or(z.literal("OFF")), startDay: z.coerce.number().int().min(1).max(31),
  endDay: z.coerce.number().int().min(1).max(31), returnMonth: z.string().regex(/^\d{4}-\d{2}$/),
});
const strings = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const numbers = (value: unknown) => Array.isArray(value) ? value.map(Number) : [];

export async function POST(request: NextRequest) {
  let returnMonth = new Date().toISOString().slice(0, 7);
  try {
    const tenant = await requirePermission("schedules", "edit");
    const parsed = schema.parse(Object.fromEntries(await request.formData()));
    returnMonth = parsed.returnMonth;
    if (parsed.endDay < parsed.startDay) throw new Error("INVALID_RANGE");
    const schedule = await db.schedule.findFirstOrThrow({ where: { id: parsed.scheduleId, companyId: tenant.companyId, status: "DRAFT" } });
    const shift = parsed.shiftId === "OFF" ? null : await db.shift.findFirstOrThrow({ where: { id: parsed.shiftId, companyId: tenant.companyId, deletedAt: null }, select: { id: true, departmentId: true } });
    const start = new Date(Date.UTC(schedule.month.getUTCFullYear(), schedule.month.getUTCMonth(), parsed.startDay));
    const end = new Date(Date.UTC(schedule.month.getUTCFullYear(), schedule.month.getUTCMonth(), parsed.endDay, 23, 59, 59));
    const where = { scheduleId: schedule.id, companyId: tenant.companyId, date: { gte: start, lte: end }, ...(parsed.employeeId === "ALL" ? {} : { employeeId: parsed.employeeId }) };
    const assignments = await db.scheduleAssignment.findMany({ where, select: { id: true, date: true, employee: { select: { departmentId: true } } } });
    if (!assignments.length) throw new Error("NO_ASSIGNMENTS");
    const departmentIds = [...new Set(assignments.map(item => item.employee.departmentId).filter((id): id is string => Boolean(id)))];
    const rules = await db.departmentScheduleRule.findMany({ where: { companyId: tenant.companyId, departmentId: { in: departmentIds } } });
    const ruleMap = new Map(rules.map(rule => [rule.departmentId, rule]));
    for (const assignment of assignments) {
      const departmentId = assignment.employee.departmentId;
      const rule = departmentId ? ruleMap.get(departmentId) : undefined;
      if (!shift) {
        if (rule && numbers(rule.forbiddenOffWeekdays).includes(assignment.date.getUTCDay())) throw new Error("OFF_NOT_ALLOWED");
      } else {
        if (shift.departmentId && shift.departmentId !== departmentId) throw new Error("SHIFT_NOT_ALLOWED");
        const allowed = strings(rule?.allowedShiftIds);
        if (allowed.length && !allowed.includes(shift.id)) throw new Error("SHIFT_NOT_ALLOWED");
      }
    }
    await db.$transaction([
      db.scheduleAssignment.updateMany({ where, data: parsed.shiftId === "OFF" ? { type: "OFF", shiftId: null } : { type: "WORK", shiftId: parsed.shiftId } }),
      db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "BULK_EDIT", module: "schedules", entityType: "Schedule", entityId: schedule.id, newValue: { employeeId: parsed.employeeId, shiftId: parsed.shiftId, startDay: parsed.startDay, endDay: parsed.endDay, count: assignments.length, departmentRulesValidated: true } } }),
    ]);
    return NextResponse.redirect(new URL(`/schedules?month=${parsed.returnMonth}&saved=bulk`, appUrl(request)), 303);
  } catch (error) {
    const code = error instanceof Error && ["OFF_NOT_ALLOWED", "SHIFT_NOT_ALLOWED"].includes(error.message) ? "department-rule" : "bulk";
    return NextResponse.redirect(new URL(`/schedules?month=${returnMonth}&error=${code}`, appUrl(request)), 303);
  }
}
