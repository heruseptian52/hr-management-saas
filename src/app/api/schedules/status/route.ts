import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ scheduleId: z.string().cuid(), status: z.enum(["DRAFT", "PUBLISHED", "LOCKED"]), returnMonth: z.string().regex(/^\d{4}-\d{2}$/) });
export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "approve");
    const parsed = schema.parse(Object.fromEntries(await request.formData()));
    const schedule = await db.schedule.findFirstOrThrow({ where: { id: parsed.scheduleId, companyId: tenant.companyId } });
    const valid = (schedule.status === "DRAFT" && parsed.status === "PUBLISHED") || (schedule.status === "PUBLISHED" && parsed.status === "LOCKED") || (schedule.status === "LOCKED" && parsed.status === "DRAFT");
    if (!valid) throw new Error("INVALID_TRANSITION");
    await db.$transaction([
      db.schedule.update({ where: { id: schedule.id }, data: { status: parsed.status, publishedAt: parsed.status === "PUBLISHED" ? new Date() : schedule.publishedAt } }),
      db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "STATUS_CHANGE", module: "schedules", entityType: "Schedule", entityId: schedule.id, previousValue: { status: schedule.status }, newValue: { status: parsed.status } } }),
    ]);
    return NextResponse.redirect(new URL(`/schedules?month=${parsed.returnMonth}&saved=status`, appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL("/schedules?error=status", appUrl(request)), 303); }
}

