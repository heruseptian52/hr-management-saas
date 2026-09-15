import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { optionalDate, optionalText, tenantRecord } from "@/lib/recruitment";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ action: z.enum(["CREATE", "TOGGLE", "DELETE"]), id: z.string().optional(), candidateId: z.string().optional(), title: z.string().trim().max(180).optional(), dueDate: z.string().optional(), notes: z.string().trim().max(500).optional() });
export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(Object.fromEntries(await req.formData()));
    const tenant = await requirePermission("recruitment", data.action === "CREATE" ? "create" : data.action === "DELETE" ? "delete" : "edit");
    if (data.action === "CREATE") {
      if (!data.candidateId || !data.title) throw new Error();
      const candidate = await db.candidate.findFirstOrThrow({ where: { id: data.candidateId, companyId: tenant.companyId, deletedAt: null } });
      const item = await db.onboardingTask.create({ data: { companyId: tenant.companyId, candidateId: candidate.id, employeeId: candidate.employeeId, title: data.title, dueDate: optionalDate(data.dueDate), notes: optionalText(data.notes, 500) } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "recruitment", entityType: "OnboardingTask", entityId: item.id, newValue: { candidateId: candidate.id, title: item.title } } });
    } else {
      const item = await db.onboardingTask.findFirstOrThrow({ where: tenantRecord(tenant.companyId, data.id ?? "") });
      const next = data.action === "DELETE" ? { deletedAt: new Date() } : item.status === "DONE" ? { status: "PENDING", completedAt: null, completedById: null } : { status: "DONE", completedAt: new Date(), completedById: tenant.session.userId };
      await db.onboardingTask.update({ where: { id: item.id }, data: next });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: data.action, module: "recruitment", entityType: "OnboardingTask", entityId: item.id, previousValue: { status: item.status }, newValue: next } });
    }
    return NextResponse.redirect(new URL("/recruitment?saved=1", appUrl(req)), 303);
  } catch { return NextResponse.redirect(new URL("/recruitment?error=task", appUrl(req)), 303); }
}
