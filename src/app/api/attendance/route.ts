import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  employeeId: z.string().min(1),
  workDate: z.coerce.date(),
  status: z.enum(["PRESENT", "LATE", "EARLY_LEAVE", "ABSENT", "LEAVE", "SICK", "PERMISSION", "HOLIDAY", "OVERTIME"]),
  checkIn: z.string(),
  checkOut: z.string(),
  notes: z.string().trim().max(500),
});

const appUrl = (request: NextRequest) => process.env.APP_URL ?? request.nextUrl.origin;
const atTime = (date: Date, time: string) => time ? new Date(`${date.toISOString().slice(0, 10)}T${time}:00`) : null;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(new URL("/attendance?error=validation", appUrl(request)), 303);
  try {
    const tenant = await requirePermission("attendance", "create");
    const employee = await db.employee.findFirst({ where: { id: parsed.data.employeeId, companyId: tenant.companyId, deletedAt: null } });
    if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");
    const workDate = new Date(Date.UTC(parsed.data.workDate.getUTCFullYear(), parsed.data.workDate.getUTCMonth(), parsed.data.workDate.getUTCDate()));
    const checkInAt = atTime(workDate, parsed.data.checkIn);
    const checkOutAt = atTime(workDate, parsed.data.checkOut);
    const workMinutes = checkInAt && checkOutAt ? Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000)) : 0;
    const attendance = await db.attendance.upsert({
      where: { companyId_employeeId_workDate: { companyId: tenant.companyId, employeeId: employee.id, workDate } },
      update: { status: parsed.data.status, checkInAt, checkOutAt, workMinutes, notes: parsed.data.notes || null, method: "MANUAL", branchId: employee.branchId },
      create: { companyId: tenant.companyId, employeeId: employee.id, branchId: employee.branchId, workDate, status: parsed.data.status, checkInAt, checkOutAt, workMinutes, notes: parsed.data.notes || null, method: "MANUAL" },
    });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "UPSERT", module: "attendance", entityType: "Attendance", entityId: attendance.id, newValue: { employeeId: employee.id, workDate, status: parsed.data.status } } });
    return NextResponse.redirect(new URL("/attendance?saved=1", appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/attendance?error=forbidden", appUrl(request)), 303);
  }
}
