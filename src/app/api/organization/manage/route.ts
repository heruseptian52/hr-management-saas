import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const base = z.object({ id: z.string().cuid(), kind: z.enum(["branch", "department", "position"]), action: z.enum(["UPDATE", "TOGGLE", "DELETE"]) });
const updateSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,20}$/), name: z.string().trim().min(2).max(100) });
type Kind = z.infer<typeof base>["kind"];
type CommonRecord = { id: string; code: string; name: string; deletedAt: Date | null };
const moduleFor = (kind: Kind) => kind === "branch" ? "branches" : kind === "department" ? "departments" : "positions";

async function findRecord(kind: Kind, id: string, companyId: string): Promise<CommonRecord | null> {
  if (kind === "branch") return db.branch.findFirst({ where: { id, companyId }, select: { id: true, code: true, name: true, deletedAt: true } });
  if (kind === "department") return db.department.findFirst({ where: { id, companyId }, select: { id: true, code: true, name: true, deletedAt: true } });
  return db.position.findFirst({ where: { id, companyId }, select: { id: true, code: true, name: true, deletedAt: true } });
}
async function duplicateCode(kind: Kind, companyId: string, code: string, id: string) {
  if (kind === "branch") return db.branch.count({ where: { companyId, code, id: { not: id } } });
  if (kind === "department") return db.department.count({ where: { companyId, code, id: { not: id } } });
  return db.position.count({ where: { companyId, code, id: { not: id } } });
}
async function updateRecord(kind: Kind, id: string, data: { code?: string; name?: string; deletedAt?: Date | null }) {
  if (kind === "branch") return db.branch.update({ where: { id }, data });
  if (kind === "department") return db.department.update({ where: { id }, data });
  return db.position.update({ where: { id }, data });
}
async function deleteRecord(kind: Kind, id: string) {
  if (kind === "branch") return db.branch.delete({ where: { id } });
  if (kind === "department") return db.department.delete({ where: { id } });
  return db.position.delete({ where: { id } });
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData(), parsed = base.parse(Object.fromEntries(form)), module = moduleFor(parsed.kind);
    const tenant = await requirePermission(module, parsed.action === "DELETE" ? "delete" : "edit");
    const record = await findRecord(parsed.kind, parsed.id, tenant.companyId); if (!record) throw new Error("NOT_FOUND");
    if (parsed.action === "UPDATE") {
      const data = updateSchema.parse(Object.fromEntries(form)); if (await duplicateCode(parsed.kind, tenant.companyId, data.code, record.id)) throw new Error("DUPLICATE");
      await updateRecord(parsed.kind, record.id, data);
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "UPDATE", module, entityType: parsed.kind, entityId: record.id, previousValue: JSON.parse(JSON.stringify(record)), newValue: data } });
    }
    if (parsed.action === "TOGGLE") {
      const deletedAt = record.deletedAt ? null : new Date(); await updateRecord(parsed.kind, record.id, { deletedAt });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: deletedAt ? "DEACTIVATE" : "ACTIVATE", module, entityType: parsed.kind, entityId: record.id } });
    }
    if (parsed.action === "DELETE") {
      const used = parsed.kind === "branch"
        ? await db.employee.count({ where: { companyId: tenant.companyId, branchId: record.id } }) + await db.shift.count({ where: { companyId: tenant.companyId, branchId: record.id } }) + await db.attendance.count({ where: { companyId: tenant.companyId, branchId: record.id } }) + await db.schedule.count({ where: { companyId: tenant.companyId, branchId: record.id } })
        : parsed.kind === "department"
          ? await db.employee.count({ where: { companyId: tenant.companyId, departmentId: record.id } }) + await db.shift.count({ where: { companyId: tenant.companyId, departmentId: record.id } }) + await db.schedule.count({ where: { companyId: tenant.companyId, departmentId: record.id } })
          : await db.employee.count({ where: { companyId: tenant.companyId, positionId: record.id } });
      if (used) return NextResponse.redirect(new URL(`/organization?error=used&kind=${parsed.kind}`, appUrl(request)), 303);
      await deleteRecord(parsed.kind, record.id);
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "DELETE", module, entityType: parsed.kind, entityId: record.id, previousValue: JSON.parse(JSON.stringify(record)) } });
    }
    return NextResponse.redirect(new URL(`/organization?saved=${parsed.action.toLowerCase()}`, appUrl(request)), 303);
  } catch (error) {
    console.error("ORGANIZATION_MANAGE", error);
    return NextResponse.redirect(new URL(`/organization?error=${error instanceof Error && error.message === "DUPLICATE" ? "duplicate" : "failed"}`, appUrl(request)), 303);
  }
}
