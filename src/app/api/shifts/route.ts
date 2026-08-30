import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,20}$/), name: z.string().trim().min(2).max(60), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), breakMinutes: z.coerce.number().int().min(0).max(480), lateToleranceMin: z.coerce.number().int().min(0).max(180), minStaff: z.coerce.number().int().min(0).max(10000), maxStaff: z.preprocess(value => value === "" ? null : value, z.coerce.number().int().min(1).max(10000).nullable()), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }).refine(data => data.maxStaff === null || data.maxStaff >= data.minStaff, { message: "Maximum staff must be greater than minimum staff" });

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("shifts", "create");
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return NextResponse.redirect(new URL("/schedules?error=shift_validation", appUrl(request)), 303);
    const shift = await db.shift.create({ data: { companyId: tenant.companyId, ...parsed.data } });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "shifts", entityType: "Shift", entityId: shift.id, newValue: parsed.data } });
    return NextResponse.redirect(new URL("/schedules?saved=shift", appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL("/schedules?error=shift_duplicate", appUrl(request)), 303); }
}
