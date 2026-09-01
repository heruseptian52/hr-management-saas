import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { safeCode } from "@/lib/employee-import";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [z.object({ action: z.literal("CREATE"), category: z.enum(["EMPLOYEE_STATUS", "MARITAL_STATUS", "RELIGION"]), name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-f]{6}$/i) }), z.object({ action: z.literal("TOGGLE"), id: z.string().cuid() })]);
export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "edit"), parsed = schema.parse(Object.fromEntries(await request.formData()));
    if (parsed.action === "CREATE") { const record = await db.masterData.create({ data: { companyId: tenant.companyId, category: parsed.category, code: safeCode(parsed.name, parsed.category.slice(0,3)), name: parsed.name, color: parsed.color } }); await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "master_data", entityType: "MasterData", entityId: record.id, newValue: { category: record.category, name: record.name } } }); }
    else { const previous = await db.masterData.findFirstOrThrow({ where: { id: parsed.id, companyId: tenant.companyId, deletedAt: null } }); await db.masterData.update({ where: { id: previous.id }, data: { isActive: !previous.isActive } }); await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "TOGGLE", module: "master_data", entityType: "MasterData", entityId: previous.id, previousValue: { isActive: previous.isActive }, newValue: { isActive: !previous.isActive } } }); }
    return NextResponse.redirect(new URL("/master-data", appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL("/master-data?error=1", appUrl(request)), 303); }
}
