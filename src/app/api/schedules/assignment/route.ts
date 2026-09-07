import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ assignmentId: z.string().cuid(), shiftId: z.string().cuid().or(z.literal("OFF")), returnMonth: z.string().regex(/^\d{4}-\d{2}$/), returnQuery: z.string().regex(/^[A-Za-z0-9=&_-]+$/).optional() });
const list = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const days = (value: unknown) => Array.isArray(value) ? value.map(Number) : [];

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "edit");
    const parsed = schema.parse(Object.fromEntries(await request.formData()));
    const assignment = await db.scheduleAssignment.findFirstOrThrow({
      where: { id: parsed.assignmentId, companyId: tenant.companyId, schedule: { status: "DRAFT" } },
      include: { employee: { select: { departmentId: true } } },
    });
    const rule = assignment.employee.departmentId ? await db.departmentScheduleRule.findFirst({ where: { companyId: tenant.companyId, departmentId: assignment.employee.departmentId } }) : null;
    if (parsed.shiftId === "OFF") {
      if (rule && days(rule.forbiddenOffWeekdays).includes(assignment.date.getUTCDay())) throw new Error("OFF_NOT_ALLOWED");
    } else {
      const shift = await db.shift.findFirstOrThrow({ where: { id: parsed.shiftId, companyId: tenant.companyId, deletedAt: null }, select: { id: true, departmentId: true } });
      if (shift.departmentId && shift.departmentId !== assignment.employee.departmentId) throw new Error("WRONG_DEPARTMENT");
      const allowed = list(rule?.allowedShiftIds);
      if (allowed.length && !allowed.includes(shift.id)) throw new Error("SHIFT_NOT_ALLOWED");
    }
    await db.$transaction([
      db.scheduleAssignment.update({ where: { id: assignment.id }, data: parsed.shiftId === "OFF" ? { type: "OFF", shiftId: null } : { type: "WORK", shiftId: parsed.shiftId } }),
      db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "EDIT", module: "schedules", entityType: "ScheduleAssignment", entityId: assignment.id, previousValue: { shiftId: assignment.shiftId, type: assignment.type }, newValue: { shiftId: parsed.shiftId === "OFF" ? null : parsed.shiftId, type: parsed.shiftId === "OFF" ? "OFF" : "WORK" } } }),
    ]);
    if (request.headers.get("accept")?.includes("application/json")) return NextResponse.json({ ok: true });
    return NextResponse.redirect(new URL(`/schedules?${parsed.returnQuery ?? `month=${parsed.returnMonth}`}&saved=manual`, appUrl(request)), 303);
  } catch (error) {
    const message = error instanceof Error && error.message === "OFF_NOT_ALLOWED" ? "Departemen ini tidak boleh libur pada hari tersebut." : error instanceof Error && ["WRONG_DEPARTMENT", "SHIFT_NOT_ALLOWED"].includes(error.message) ? "Shift ini tidak diperbolehkan untuk departemen karyawan." : "Perubahan gagal disimpan.";
    return request.headers.get("accept")?.includes("application/json") ? NextResponse.json({ error: message }, { status: 400 }) : NextResponse.redirect(new URL("/schedules?error=manual", appUrl(request)), 303);
  }
}
