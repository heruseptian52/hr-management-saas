import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { generateMonthlySchedule } from "@/lib/scheduling";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), branchId: z.string().cuid().or(z.literal("")), departmentId: z.string().cuid().or(z.literal("")), rotation: z.enum(["DAILY", "WEEKLY", "FIXED"]).default("DAILY") });

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "create");
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) throw new Error("INVALID");
    const [year, month] = parsed.data.month.split("-").map(Number);
    const branchId = parsed.data.branchId || null, departmentId = parsed.data.departmentId || null;
    if (branchId && !(await db.branch.count({ where: { id: branchId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("BRANCH");
    if (departmentId && !(await db.department.count({ where: { id: departmentId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("DEPARTMENT");
    const [employees, shifts] = await Promise.all([
      db.employee.findMany({ where: { companyId: tenant.companyId, deletedAt: null, employmentStatus: "ACTIVE", ...(branchId ? { branchId } : {}), ...(departmentId ? { departmentId } : {}) }, select: { id: true, monthlyDaysOff: true } }),
      db.shift.findMany({ where: { companyId: tenant.companyId, deletedAt: null, OR: [{ branchId: null }, { branchId }], AND: [{ OR: [{ departmentId: null }, { departmentId }] }] }, select: { id: true } }),
    ]);
    if (!employees.length || !shifts.length) throw new Error("MISSING_DATA");
    const monthDate = new Date(Date.UTC(year, month - 1, 1));
    const generated = generateMonthlySchedule(year, month, employees, shifts.map(shift => shift.id), parsed.data.rotation);
    const schedule = await db.$transaction(async transaction => {
      const existing = await transaction.schedule.findFirst({ where: { companyId: tenant.companyId, month: monthDate, branchId, departmentId } });
      const current = existing ? await transaction.schedule.update({ where: { id: existing.id }, data: { status: "DRAFT", name: `Jadwal ${parsed.data.month}` } }) : await transaction.schedule.create({ data: { companyId: tenant.companyId, month: monthDate, name: `Jadwal ${parsed.data.month}`, branchId, departmentId } });
      await transaction.scheduleAssignment.deleteMany({ where: { scheduleId: current.id, companyId: tenant.companyId } });
      await transaction.scheduleAssignment.createMany({ data: generated.map(item => ({ companyId: tenant.companyId, scheduleId: current.id, employeeId: item.employeeId, shiftId: item.shiftId, type: item.type, date: new Date(Date.UTC(year, month - 1, item.day)) })) });
      return current;
    });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "GENERATE", module: "schedules", entityType: "Schedule", entityId: schedule.id, newValue: { month: parsed.data.month, employees: employees.length, assignments: generated.length, rotation: parsed.data.rotation } } });
    return NextResponse.redirect(new URL(`/schedules?month=${parsed.data.month}&branchId=${branchId ?? ""}&departmentId=${departmentId ?? ""}&saved=schedule`, appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL("/schedules?error=generation", appUrl(request)), 303); }
}
