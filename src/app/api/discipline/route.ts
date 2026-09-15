import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { disciplineDate, disciplineSeverities, disciplineStatuses, tenantDisciplineRecord } from "@/lib/discipline";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ action: z.enum(["CREATE", "STATUS", "DELETE"]), id: z.string().optional(), employeeId: z.string().optional(), caseNumber: z.string().trim().max(50).optional(), incidentDate: z.string().optional(), category: z.string().trim().max(100).optional(), severity: z.string().optional(), title: z.string().trim().max(180).optional(), description: z.string().trim().max(2000).optional(), actionTaken: z.string().trim().max(1000).optional(), validUntil: z.string().optional(), status: z.string().optional(), resolution: z.string().trim().max(1000).optional() });
const optional = (value: string | undefined) => value?.trim() || null;
export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(Object.fromEntries(await req.formData())), permission = data.action === "CREATE" ? "create" : data.action === "DELETE" ? "delete" : "edit", tenant = await requirePermission("discipline", permission), actorUserId = tenant.session.userId;
    if (data.action === "CREATE") {
      if (!data.employeeId || !data.caseNumber || !data.incidentDate || !data.category || !data.title || !data.description) throw new Error("REQUIRED");
      const employee = await db.employee.findFirstOrThrow({ where: { id: data.employeeId, companyId: tenant.companyId, deletedAt: null } });
      const incidentDate = disciplineDate(data.incidentDate)!, validUntil = disciplineDate(data.validUntil, true);
      if (validUntil && validUntil < incidentDate) throw new Error("DATE_RANGE");
      const item = await db.disciplinaryCase.create({ data: { companyId: tenant.companyId, employeeId: employee.id, caseNumber: data.caseNumber.toUpperCase(), incidentDate, category: data.category, severity: disciplineSeverities.includes(data.severity as never) ? data.severity : "WARNING", title: data.title, description: data.description, actionTaken: optional(data.actionTaken), validUntil, createdById: actorUserId } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: "CREATE", module: "discipline", entityType: "DisciplinaryCase", entityId: item.id, newValue: { employeeId: employee.id, caseNumber: item.caseNumber, severity: item.severity } } });
    } else {
      const item = await db.disciplinaryCase.findFirstOrThrow({ where: tenantDisciplineRecord(tenant.companyId, data.id ?? "") });
      const next = data.action === "DELETE" ? { deletedAt: new Date(), status: "CANCELLED" } : (() => { const status = disciplineStatuses.includes(data.status as never) ? data.status! : item.status; return { status, resolution: optional(data.resolution), resolvedAt: status === "RESOLVED" ? new Date() : null }; })();
      await db.disciplinaryCase.update({ where: { id: item.id }, data: next });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: data.action, module: "discipline", entityType: "DisciplinaryCase", entityId: item.id, previousValue: { status: item.status, resolution: item.resolution }, newValue: next } });
    }
    return NextResponse.redirect(new URL("/discipline?saved=1", appUrl(req)), 303);
  } catch (error) { return NextResponse.redirect(new URL(`/discipline?error=${encodeURIComponent(error instanceof Error ? error.message : "FAILED")}`, appUrl(req)), 303); }
}
