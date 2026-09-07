import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { generateMonthlySchedule, RotationMode } from "@/lib/scheduling";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), branchId: z.string().cuid().or(z.literal("")), departmentId: z.string().cuid().or(z.literal("")), rotation: z.enum(["DAILY", "WEEKLY", "FIXED"]).default("DAILY") });
const stringList = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const numberList = (value: unknown) => Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : [];

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "create");
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) throw new Error("INVALID");
    const [year, month] = parsed.data.month.split("-").map(Number);
    const branchId = parsed.data.branchId || null, departmentId = parsed.data.departmentId || null;
    if (branchId && !(await db.branch.count({ where: { id: branchId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("BRANCH");
    if (departmentId && !(await db.department.count({ where: { id: departmentId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("DEPARTMENT");

    const [rawEmployees, shifts, rules, positionRules] = await Promise.all([
      db.employee.findMany({
        where: { companyId: tenant.companyId, deletedAt: null, employmentStatus: "ACTIVE", ...(branchId ? { branchId } : {}), ...(departmentId ? { departmentId } : {}) },
        select: { id: true, monthlyDaysOff: true, departmentId: true, positionId: true },
      }),
      db.shift.findMany({
        where: { companyId: tenant.companyId, deletedAt: null, ...(branchId ? { OR: [{ branchId: null }, { branchId }] } : {}) },
        select: { id: true, departmentId: true },
      }),
      db.departmentScheduleRule.findMany({ where: { companyId: tenant.companyId, ...(departmentId ? { departmentId } : {}) } }),
      db.positionScheduleRule.findMany({ where: { companyId: tenant.companyId } }),
    ]);
    if (!rawEmployees.length || !shifts.length) throw new Error("MISSING_DATA");
    const ruleMap = new Map(rules.map(rule => [rule.departmentId, rule]));
    const positionRuleMap = new Map(positionRules.map(rule => [rule.positionId, rule]));
    const employees = rawEmployees.map(employee => {
      const rule = employee.departmentId ? ruleMap.get(employee.departmentId) : undefined;
      const positionRule = employee.positionId ? positionRuleMap.get(employee.positionId) : undefined;
      let allowedShiftIds = shifts.filter(shift => !shift.departmentId || shift.departmentId === employee.departmentId).map(shift => shift.id);
      const departmentAllowed = stringList(rule?.allowedShiftIds);
      const positionAllowed = stringList(positionRule?.allowedShiftIds);
      if (departmentAllowed.length) allowedShiftIds = allowedShiftIds.filter(id => departmentAllowed.includes(id));
      if (positionAllowed.length) allowedShiftIds = allowedShiftIds.filter(id => positionAllowed.includes(id));
      if (!allowedShiftIds.length) throw new Error("NO_ALLOWED_SHIFT");
      const forbiddenOffWeekdays = [...new Set([...numberList(rule?.forbiddenOffWeekdays), ...numberList(positionRule?.forbiddenOffWeekdays)])];
      return { id: employee.id, monthlyDaysOff: employee.monthlyDaysOff, allowedShiftIds, forbiddenOffWeekdays };
    });
    const selectedRule = departmentId ? ruleMap.get(departmentId) : undefined;
    const rotation = (selectedRule?.rotation as RotationMode | undefined) ?? parsed.data.rotation;
    const monthDate = new Date(Date.UTC(year, month - 1, 1));
    const generated = generateMonthlySchedule(year, month, employees, shifts.map(shift => shift.id), rotation);
    const schedule = await db.$transaction(async transaction => {
      const existing = await transaction.schedule.findFirst({ where: { companyId: tenant.companyId, month: monthDate, branchId, departmentId } });
      if (existing && existing.status !== "DRAFT") throw new Error("SCHEDULE_LOCKED");
      const current = existing ?? await transaction.schedule.create({ data: { companyId: tenant.companyId, month: monthDate, name: `Jadwal ${parsed.data.month}`, branchId, departmentId } });
      await transaction.scheduleAssignment.createMany({
        data: generated.map(item => ({ companyId: tenant.companyId, scheduleId: current.id, employeeId: item.employeeId, shiftId: item.shiftId, type: item.type, date: new Date(Date.UTC(year, month - 1, item.day)) })),
        skipDuplicates: true,
      });
      return current;
    });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "GENERATE_MISSING", module: "schedules", entityType: "Schedule", entityId: schedule.id, newValue: { month: parsed.data.month, employees: employees.length, assignmentsConsidered: generated.length, rotation, departmentRulesApplied: rules.length, positionRulesApplied: positionRules.length, existingAssignmentsPreserved: true } } });
    return NextResponse.redirect(new URL(`/schedules?month=${parsed.data.month}&branchId=${branchId ?? ""}&departmentId=${departmentId ?? ""}&saved=schedule`, appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/schedules?error=generation", appUrl(request)), 303);
  }
}
