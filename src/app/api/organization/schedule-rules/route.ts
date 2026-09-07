import { ensureSchedulingRuleSchema } from "@/lib/scheduling-rule-schema";
import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  departmentId: z.string().cuid(),
  rotation: z.enum(["DAILY", "WEEKLY", "FIXED"]).default("DAILY"),
});

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("departments", "edit");
    await ensureSchedulingRuleSchema();
    const form = await request.formData();
    const parsed = schema.parse(Object.fromEntries(form));
    const allowedShiftIds = [...new Set(form.getAll("allowedShiftIds").map(String))];
    const forbiddenOffWeekdays = [...new Set(form.getAll("forbiddenOffWeekdays").map(Number))]
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);

    const department = await db.department.findFirstOrThrow({
      where: { id: parsed.departmentId, companyId: tenant.companyId, deletedAt: null },
      select: { id: true, name: true },
    });
    const validShiftCount = await db.shift.count({
      where: { id: { in: allowedShiftIds }, companyId: tenant.companyId, deletedAt: null },
    });
    if (validShiftCount !== allowedShiftIds.length) throw new Error("INVALID_SHIFT");

    const previous = await db.departmentScheduleRule.findUnique({ where: { departmentId: department.id } });
    const rule = await db.departmentScheduleRule.upsert({
      where: { departmentId: department.id },
      create: { companyId: tenant.companyId, departmentId: department.id, allowedShiftIds, forbiddenOffWeekdays, rotation: parsed.rotation },
      update: { allowedShiftIds, forbiddenOffWeekdays, rotation: parsed.rotation },
    });
    await db.auditLog.create({
      data: {
        companyId: tenant.companyId,
        actorUserId: tenant.session.userId,
        action: previous ? "EDIT" : "CREATE",
        module: "departments",
        entityType: "DepartmentScheduleRule",
        entityId: rule.id,
        previousValue: previous ? { allowedShiftIds: previous.allowedShiftIds, forbiddenOffWeekdays: previous.forbiddenOffWeekdays, rotation: previous.rotation } : undefined,
        newValue: { department: department.name, allowedShiftIds, forbiddenOffWeekdays, rotation: parsed.rotation },
      },
    });
    return NextResponse.redirect(new URL("/organization/schedule-rules?saved=1", appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/organization/schedule-rules?error=1", appUrl(request)), 303);
  }
}
