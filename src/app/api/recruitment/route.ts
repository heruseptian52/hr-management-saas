import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { candidateStages, normalizeIdentity, optionalDate, optionalText, tenantRecord } from "@/lib/recruitment";
import { EmploymentType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const input = z.object({
  action: z.enum(["CREATE_VACANCY", "VACANCY_STATUS", "DELETE_VACANCY", "CREATE_CANDIDATE", "CANDIDATE_STAGE", "DELETE_CANDIDATE", "HIRE"]),
  id: z.string().trim().max(80).optional(), vacancyId: z.string().trim().max(80).optional(), code: z.string().trim().max(40).optional(), title: z.string().trim().max(150).optional(),
  fullName: z.string().trim().max(150).optional(), email: z.string().trim().max(180).optional(), phone: z.string().trim().max(80).optional(), nationalId: z.string().trim().max(40).optional(),
  birthDate: z.string().optional(), deadline: z.string().optional(), address: z.string().trim().max(500).optional(), source: z.string().trim().max(100).optional(), notes: z.string().trim().max(1000).optional(),
  stage: z.string().trim().max(30).optional(), status: z.string().trim().max(30).optional(), openings: z.coerce.number().int().min(1).max(999).optional(),
  employeeNumber: z.string().trim().max(50).optional(), joinDate: z.string().optional(), branchId: z.string().trim().max(80).optional(), departmentId: z.string().trim().max(80).optional(), positionId: z.string().trim().max(80).optional(), employmentType: z.string().trim().max(30).optional(),
});

const redirectResult = (req: NextRequest, value: string) => NextResponse.redirect(new URL(`/recruitment?${value}`, appUrl(req)), 303);

export async function POST(req: NextRequest) {
  try {
    const data = input.parse(Object.fromEntries(await req.formData()));
    const permission = data.action.startsWith("CREATE") ? "create" : data.action.startsWith("DELETE") ? "delete" : "edit";
    const tenant = await requirePermission("recruitment", permission);
    const actorUserId = tenant.session.userId;

    if (data.action === "CREATE_VACANCY") {
      if (!data.code || !data.title) throw new Error("REQUIRED");
      if (data.departmentId && !await db.department.findFirst({ where: tenantRecord(tenant.companyId, data.departmentId), select: { id: true } })) throw new Error("TENANT_REFERENCE");
      if (data.positionId && !await db.position.findFirst({ where: tenantRecord(tenant.companyId, data.positionId), select: { id: true } })) throw new Error("TENANT_REFERENCE");
      const item = await db.jobVacancy.create({ data: { companyId: tenant.companyId, code: data.code.toUpperCase(), title: data.title, departmentId: optionalText(data.departmentId, 80), positionId: optionalText(data.positionId, 80), openings: data.openings ?? 1, description: optionalText(data.notes, 1000), deadline: optionalDate(data.deadline) } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: "CREATE", module: "recruitment", entityType: "JobVacancy", entityId: item.id, newValue: { code: item.code, title: item.title } } });
    }

    if (data.action === "VACANCY_STATUS" || data.action === "DELETE_VACANCY") {
      const item = await db.jobVacancy.findFirstOrThrow({ where: tenantRecord(tenant.companyId, data.id ?? "") });
      const next = data.action === "DELETE_VACANCY" ? { deletedAt: new Date(), status: "CLOSED" } : { status: ["DRAFT", "OPEN", "CLOSED"].includes(data.status ?? "") ? data.status : "DRAFT" };
      await db.jobVacancy.update({ where: { id: item.id }, data: next });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: data.action === "DELETE_VACANCY" ? "DELETE" : "UPDATE", module: "recruitment", entityType: "JobVacancy", entityId: item.id, previousValue: { status: item.status }, newValue: next } });
    }

    if (data.action === "CREATE_CANDIDATE") {
      if (!data.fullName) throw new Error("REQUIRED");
      if (data.email && !z.string().email().safeParse(data.email).success) throw new Error("EMAIL");
      if (data.vacancyId) await db.jobVacancy.findFirstOrThrow({ where: { id: data.vacancyId, companyId: tenant.companyId, deletedAt: null } });
      const item = await db.candidate.create({ data: { companyId: tenant.companyId, vacancyId: optionalText(data.vacancyId, 80), fullName: data.fullName, email: optionalText(data.email, 180), phone: optionalText(data.phone, 80), nationalId: normalizeIdentity(data.nationalId), birthDate: optionalDate(data.birthDate), address: optionalText(data.address, 500), source: optionalText(data.source, 100), notes: optionalText(data.notes, 1000) } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: "CREATE", module: "recruitment", entityType: "Candidate", entityId: item.id, newValue: { fullName: item.fullName, vacancyId: item.vacancyId } } });
    }

    if (data.action === "CANDIDATE_STAGE" || data.action === "DELETE_CANDIDATE") {
      const item = await db.candidate.findFirstOrThrow({ where: tenantRecord(tenant.companyId, data.id ?? "") });
      if (data.action === "DELETE_CANDIDATE" && item.employeeId) throw new Error("HIRED");
      const stage = candidateStages.includes(data.stage as never) ? data.stage : item.stage;
      const next = data.action === "DELETE_CANDIDATE" ? { deletedAt: new Date() } : { stage };
      await db.candidate.update({ where: { id: item.id }, data: next });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: data.action === "DELETE_CANDIDATE" ? "DELETE" : "UPDATE", module: "recruitment", entityType: "Candidate", entityId: item.id, previousValue: { stage: item.stage }, newValue: next } });
    }

    if (data.action === "HIRE") {
      if (!data.employeeNumber) throw new Error("NUMBER");
      const candidate = await db.candidate.findFirstOrThrow({ where: { id: data.id, companyId: tenant.companyId, deletedAt: null, employeeId: null } });
      const duplicate = await db.employee.findFirst({ where: { companyId: tenant.companyId, deletedAt: null, OR: [candidate.nationalId ? { nationalId: candidate.nationalId } : undefined, candidate.email ? { email: { equals: candidate.email, mode: "insensitive" } } : undefined].filter(Boolean) as ({ nationalId: string } | { email: { equals: string; mode: "insensitive" } })[] }, select: { id: true } });
      if (duplicate) throw new Error("DUPLICATE_EMPLOYEE");
      const ids = [{ id: data.branchId, model: "branch" }, { id: data.departmentId, model: "department" }, { id: data.positionId, model: "position" }] as const;
      for (const target of ids) if (target.id) {
        const found = await (db[target.model] as typeof db.branch).findFirst({ where: { id: target.id, companyId: tenant.companyId, deletedAt: null }, select: { id: true } });
        if (!found) throw new Error("TENANT_REFERENCE");
      }
      const employmentType = Object.values(EmploymentType).includes(data.employmentType as EmploymentType) ? data.employmentType as EmploymentType : null;
      const result = await db.$transaction(async tx => {
        const employee = await tx.employee.create({ data: { companyId: tenant.companyId, employeeNumber: data.employeeNumber!.toUpperCase(), fullName: candidate.fullName, email: candidate.email, phone: candidate.phone, nationalId: candidate.nationalId, birthDate: candidate.birthDate, address: candidate.address, joinDate: optionalDate(data.joinDate) ?? new Date(), branchId: optionalText(data.branchId, 80), departmentId: optionalText(data.departmentId, 80), positionId: optionalText(data.positionId, 80), employmentType } });
        await tx.candidate.update({ where: { id: candidate.id }, data: { employeeId: employee.id, stage: "HIRED" } });
        await tx.onboardingTask.createMany({ data: ["Lengkapi data dan identitas", "Lengkapi dokumen karyawan", "Lengkapi rekening dan BPJS", "Briefing serta serah terima kerja"].map(title => ({ companyId: tenant.companyId, candidateId: candidate.id, employeeId: employee.id, title })) });
        return employee;
      });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: "HIRE", module: "recruitment", entityType: "Candidate", entityId: candidate.id, previousValue: { stage: candidate.stage }, newValue: { stage: "HIRED", employeeId: result.id, employeeNumber: result.employeeNumber } } });
    }
    return redirectResult(req, "saved=1");
  } catch (error) {
    const code = error instanceof Error ? error.message : "FAILED";
    return redirectResult(req, `error=${encodeURIComponent(code)}`);
  }
}
