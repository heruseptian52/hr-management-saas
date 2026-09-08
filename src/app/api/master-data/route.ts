import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { safeCode } from "@/lib/employee-import";
import { masterDataCategories } from "@/lib/master-data";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const category = z.enum(masterDataCategories);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CREATE"), category, name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-f]{6}$/i), sortOrder: z.coerce.number().int().min(0).max(999).default(0) }),
  z.object({ action: z.literal("UPDATE"), id: z.string().cuid(), name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-f]{6}$/i), sortOrder: z.coerce.number().int().min(0).max(999) }),
  z.object({ action: z.literal("TOGGLE"), id: z.string().cuid() }),
  z.object({ action: z.literal("DELETE"), id: z.string().cuid() }),
]);

async function tenantWith(action: "create" | "edit" | "delete") {
  try { return await requirePermission("master_data", action); }
  catch { return requirePermission("employees", action === "create" ? "edit" : action); }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.parse(Object.fromEntries(await request.formData())), tenant = await tenantWith(parsed.action === "CREATE" ? "create" : parsed.action === "DELETE" ? "delete" : "edit");
    if (parsed.action === "CREATE") {
      const duplicate = await db.masterData.count({ where: { companyId: tenant.companyId, category: parsed.category, name: { equals: parsed.name, mode: "insensitive" }, deletedAt: null } });
      if (duplicate) throw new Error("DUPLICATE");
      const record = await db.masterData.create({ data: { companyId: tenant.companyId, category: parsed.category, code: safeCode(parsed.name, parsed.category.slice(0, 3)), name: parsed.name, color: parsed.color, sortOrder: parsed.sortOrder } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "master_data", entityType: "MasterData", entityId: record.id, newValue: { category: record.category, name: record.name } } });
    } else {
      const previous = await db.masterData.findFirstOrThrow({ where: { id: parsed.id, companyId: tenant.companyId, deletedAt: null } });
      if (parsed.action === "UPDATE") {
        const duplicate = await db.masterData.count({ where: { companyId: tenant.companyId, category: previous.category, name: { equals: parsed.name, mode: "insensitive" }, id: { not: previous.id }, deletedAt: null } });
        if (duplicate) throw new Error("DUPLICATE");
        await db.masterData.update({ where: { id: previous.id }, data: { name: parsed.name, color: parsed.color, sortOrder: parsed.sortOrder } });
        await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "UPDATE", module: "master_data", entityType: "MasterData", entityId: previous.id, previousValue: { name: previous.name, color: previous.color, sortOrder: previous.sortOrder }, newValue: { name: parsed.name, color: parsed.color, sortOrder: parsed.sortOrder } } });
      }
      if (parsed.action === "TOGGLE") {
        await db.masterData.update({ where: { id: previous.id }, data: { isActive: !previous.isActive } });
        await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: previous.isActive ? "DEACTIVATE" : "ACTIVATE", module: "master_data", entityType: "MasterData", entityId: previous.id } });
      }
      if (parsed.action === "DELETE") {
        const used = previous.category === "EMPLOYEE_STATUS" ? await db.employee.count({ where: { companyId: tenant.companyId, employeeStatusLabel: { equals: previous.name, mode: "insensitive" } } }) : previous.category === "MARITAL_STATUS" ? await db.employee.count({ where: { companyId: tenant.companyId, maritalStatus: { equals: previous.name, mode: "insensitive" } } }) : previous.category === "RELIGION" ? await db.employee.count({ where: { companyId: tenant.companyId, religion: { equals: previous.name, mode: "insensitive" } } }) : previous.category === "CONTRACT_TYPE" ? await db.employee.count({ where: { companyId: tenant.companyId, contractTypeLabel: { equals: previous.name, mode: "insensitive" } } }) : 0;
        if (used) return NextResponse.redirect(new URL("/master-data?error=used", appUrl(request)), 303);
        await db.masterData.delete({ where: { id: previous.id } });
        await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "DELETE", module: "master_data", entityType: "MasterData", entityId: previous.id, previousValue: { category: previous.category, name: previous.name } } });
      }
    }
    return NextResponse.redirect(new URL("/master-data?saved=1", appUrl(request)), 303);
  } catch (error) {
    console.error("MASTER_DATA", error);
    return NextResponse.redirect(new URL(`/master-data?error=${error instanceof Error && error.message === "DUPLICATE" ? "duplicate" : "failed"}`, appUrl(request)), 303);
  }
}
