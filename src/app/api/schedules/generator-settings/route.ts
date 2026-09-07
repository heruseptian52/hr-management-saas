import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { ensureSchedulingRuleSchema } from "@/lib/scheduling-rule-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const baseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  branchId: z.string().cuid().or(z.literal("")),
  departmentId: z.string().cuid().or(z.literal("")),
  rotation: z.enum(["DAILY", "WEEKLY", "FIXED"]).default("DAILY"),
  action: z.enum(["save", "generate"]).default("generate"),
});

export async function POST(request: NextRequest) {
  let returnMonth = new Date().toISOString().slice(0, 7);
  try {
    const tenant = await requirePermission("schedules", "create");
    await ensureSchedulingRuleSchema();
    const form = await request.formData();
    const parsed = baseSchema.parse(Object.fromEntries(form));
    returnMonth = parsed.month;
    const positionIds = [...new Set(form.getAll("positionId").map(String))];
    const positions = await db.position.findMany({
      where: { id: { in: positionIds }, companyId: tenant.companyId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (positions.length !== positionIds.length) throw new Error("INVALID_POSITION");

    const shiftIds = [...new Set(positionIds.flatMap(positionId => form.getAll(`shift__${positionId}`).map(String)))];
    const validShiftCount = await db.shift.count({ where: { id: { in: shiftIds }, companyId: tenant.companyId, deletedAt: null } });
    if (validShiftCount !== shiftIds.length) throw new Error("INVALID_SHIFT");

    await db.$transaction(async transaction => {
      for (const position of positions) {
        const allowedShiftIds = [...new Set(form.getAll(`shift__${position.id}`).map(String))];
        const forbiddenOffWeekdays = [...new Set(form.getAll(`off__${position.id}`).map(Number))]
          .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
        await transaction.positionScheduleRule.upsert({
          where: { positionId: position.id },
          create: { companyId: tenant.companyId, positionId: position.id, allowedShiftIds, forbiddenOffWeekdays, rotation: parsed.rotation },
          update: { allowedShiftIds, forbiddenOffWeekdays, rotation: parsed.rotation },
        });
      }
      await transaction.auditLog.create({
        data: {
          companyId: tenant.companyId,
          actorUserId: tenant.session.userId,
          action: "BULK_CONFIGURE",
          module: "schedules",
          entityType: "PositionScheduleRule",
          newValue: { positions: positions.length, month: parsed.month, rotation: parsed.rotation },
        },
      });
    });

    if (parsed.action === "generate") {
      return NextResponse.redirect(new URL("/api/schedules/generate", appUrl(request)), 307);
    }
    const query = new URLSearchParams({ month: parsed.month, branchId: parsed.branchId, departmentId: parsed.departmentId, saved: "rules" });
    return NextResponse.redirect(new URL(`/schedules/generator?${query}`, appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL(`/schedules/generator?month=${returnMonth}&error=settings`, appUrl(request)), 303);
  }
}
