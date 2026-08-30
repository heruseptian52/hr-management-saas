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

export async function POST(request: NextRequest) {
  let returnMonth = new Date().toISOString().slice(0, 7);
  try {
    const tenant = await requirePermission("schedules", "edit");
    const parsed = schema.parse(Object.fromEntries(await request.formData()));
    returnMonth = parsed.returnMonth;
    if (parsed.endDay < parsed.startDay) throw new Error("INVALID_RANGE");
    const schedule = await db.schedule.findFirstOrThrow({ where: { id: parsed.scheduleId, companyId: tenant.companyId, status: "DRAFT" } });
    if (parsed.shiftId !== "OFF" && !(await db.shift.count({ where: { id: parsed.shiftId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("SHIFT");
    const start = new Date(Date.UTC(schedule.month.getUTCFullYear(), schedule.month.getUTCMonth(), parsed.startDay));
    const end = new Date(Date.UTC(schedule.month.getUTCFullYear(), schedule.month.getUTCMonth(), parsed.endDay, 23, 59, 59));
    const where = { scheduleId: schedule.id, companyId: tenant.companyId, date: { gte: start, lte: end }, ...(parsed.employeeId === "ALL" ? {} : { employeeId: parsed.employeeId }) };
    const count = await db.scheduleAssignment.count({ where });
    if (!count) throw new Error("NO_ASSIGNMENTS");
    await db.$transaction([
      db.scheduleAssignment.updateMany({ where, data: parsed.shiftId === "OFF" ? { type: "OFF", shiftId: null } : { type: "WORK", shiftId: parsed.shiftId } }),
      db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "BULK_EDIT", module: "schedules", entityType: "Schedule", entityId: schedule.id, newValue: { employeeId: parsed.employeeId, shiftId: parsed.shiftId, startDay: parsed.startDay, endDay: parsed.endDay, count } } }),
    ]);
    return NextResponse.redirect(new URL(`/schedules?month=${parsed.returnMonth}&saved=bulk`, appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL(`/schedules?month=${returnMonth}&error=bulk`, appUrl(request)), 303); }
}
