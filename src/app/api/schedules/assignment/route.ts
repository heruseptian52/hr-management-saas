import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ assignmentId: z.string().cuid(), shiftId: z.string().cuid().or(z.literal("OFF")), returnMonth: z.string().regex(/^\d{4}-\d{2}$/), returnQuery: z.string().regex(/^[A-Za-z0-9=&_-]+$/).optional() });
export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "edit");
    const parsed = schema.parse(Object.fromEntries(await request.formData()));
    const assignment = await db.scheduleAssignment.findFirstOrThrow({ where: { id: parsed.assignmentId, companyId: tenant.companyId, schedule: { status: "DRAFT" } } });
    if (parsed.shiftId !== "OFF" && !(await db.shift.count({ where: { id: parsed.shiftId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("SHIFT");
    await db.scheduleAssignment.update({ where: { id: assignment.id }, data: parsed.shiftId === "OFF" ? { type: "OFF", shiftId: null } : { type: "WORK", shiftId: parsed.shiftId } });
    return NextResponse.redirect(new URL(`/schedules?${parsed.returnQuery ?? `month=${parsed.returnMonth}`}&saved=manual`, request.url), 303);
  } catch { return NextResponse.redirect(new URL("/schedules?error=manual", request.url), 303); }
}
