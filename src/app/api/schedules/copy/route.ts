import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  branchId: z.string().cuid().or(z.literal("")),
  departmentId: z.string().cuid().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  let returnMonth = new Date().toISOString().slice(0, 7);
  try {
    const tenant = await requirePermission("schedules", "create");
    const parsed = schema.parse(Object.fromEntries(await request.formData()));
    returnMonth = parsed.month;
    const [year, month] = parsed.month.split("-").map(Number);
    const branchId = parsed.branchId || null;
    const departmentId = parsed.departmentId || null;
    const targetMonth = new Date(Date.UTC(year, month - 1, 1));
    const previousMonth = new Date(Date.UTC(year, month - 2, 1));
    const daysInTarget = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const previous = await db.schedule.findFirst({
      where: { companyId: tenant.companyId, month: previousMonth, branchId, departmentId },
      include: { assignments: true },
    });
    if (!previous) throw new Error("PREVIOUS_NOT_FOUND");

    const activeEmployeeIds = new Set((await db.employee.findMany({
      where: { companyId: tenant.companyId, deletedAt: null, employmentStatus: "ACTIVE", ...(branchId ? { branchId } : {}), ...(departmentId ? { departmentId } : {}) },
      select: { id: true },
    })).map(item => item.id));
    const copied = previous.assignments.filter(item => activeEmployeeIds.has(item.employeeId) && item.date.getUTCDate() <= daysInTarget);
    if (!copied.length) throw new Error("NO_ACTIVE_EMPLOYEES");

    const schedule = await db.$transaction(async transaction => {
      const existing = await transaction.schedule.findFirst({ where: { companyId: tenant.companyId, month: targetMonth, branchId, departmentId } });
      const current = existing
        ? await transaction.schedule.update({ where: { id: existing.id }, data: { status: "DRAFT", name: `Jadwal ${parsed.month}` } })
        : await transaction.schedule.create({ data: { companyId: tenant.companyId, month: targetMonth, name: `Jadwal ${parsed.month}`, branchId, departmentId } });
      await transaction.scheduleAssignment.deleteMany({ where: { scheduleId: current.id, companyId: tenant.companyId } });
      await transaction.scheduleAssignment.createMany({ data: copied.map(item => ({
        companyId: tenant.companyId, scheduleId: current.id, employeeId: item.employeeId,
        shiftId: item.shiftId, type: item.type, notes: item.notes,
        date: new Date(Date.UTC(year, month - 1, item.date.getUTCDate())),
      })) });
      return current;
    });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "COPY_PREVIOUS", module: "schedules", entityType: "Schedule", entityId: schedule.id, newValue: { month: parsed.month, assignments: copied.length } } });
    return NextResponse.redirect(new URL(`/schedules?month=${parsed.month}&branchId=${branchId ?? ""}&departmentId=${departmentId ?? ""}&saved=copy`, appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL(`/schedules?month=${returnMonth}&error=copy`, appUrl(request)), 303);
  }
}
