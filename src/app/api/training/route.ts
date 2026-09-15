import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { attendanceStatuses, completionStatuses, parseTrainingDate, tenantTrainingRecord, trainingStatuses, validateTrainingRange } from "@/lib/training";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["CREATE_PROGRAM", "PROGRAM_STATUS", "DELETE_PROGRAM", "ADD_PARTICIPANT", "UPDATE_PARTICIPANT", "DELETE_PARTICIPANT"]), id: z.string().optional(), trainingProgramId: z.string().optional(), employeeId: z.string().optional(),
  code: z.string().trim().max(40).optional(), name: z.string().trim().max(180).optional(), category: z.string().trim().max(100).optional(), provider: z.string().trim().max(150).optional(), location: z.string().trim().max(180).optional(), startDate: z.string().optional(), endDate: z.string().optional(), capacity: z.coerce.number().int().min(1).max(10000).optional(), cost: z.coerce.number().min(0).max(999999999999).optional(), description: z.string().trim().max(1500).optional(),
  status: z.string().optional(), attendanceStatus: z.string().optional(), completionStatus: z.string().optional(), score: z.coerce.number().int().min(0).max(100).optional(), certificateNumber: z.string().trim().max(100).optional(), certificateUrl: z.string().trim().url().max(500).optional().or(z.literal("")), notes: z.string().trim().max(500).optional(),
});
const clean = (value: string | undefined) => value?.trim() || null;

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(Object.fromEntries(await req.formData()));
    const permission = data.action.startsWith("CREATE") || data.action === "ADD_PARTICIPANT" ? "create" : data.action.startsWith("DELETE") ? "delete" : "edit";
    const tenant = await requirePermission("training", permission), actorUserId = tenant.session.userId;
    if (data.action === "CREATE_PROGRAM") {
      if (!data.code || !data.name || !data.startDate || !data.endDate) throw new Error("REQUIRED");
      const startDate = parseTrainingDate(data.startDate), endDate = parseTrainingDate(data.endDate); validateTrainingRange(startDate, endDate);
      const item = await db.trainingProgram.create({ data: { companyId: tenant.companyId, code: data.code.toUpperCase(), name: data.name, category: clean(data.category), provider: clean(data.provider), location: clean(data.location), startDate, endDate, capacity: data.capacity, cost: data.cost, description: clean(data.description) } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: "CREATE", module: "training", entityType: "TrainingProgram", entityId: item.id, newValue: { code: item.code, name: item.name, startDate, endDate } } });
    }
    if (data.action === "PROGRAM_STATUS" || data.action === "DELETE_PROGRAM") {
      const item = await db.trainingProgram.findFirstOrThrow({ where: tenantTrainingRecord(tenant.companyId, data.id ?? "") });
      const next = data.action === "DELETE_PROGRAM" ? { deletedAt: new Date(), status: "CANCELLED" } : { status: trainingStatuses.includes(data.status as never) ? data.status : item.status };
      await db.trainingProgram.update({ where: { id: item.id }, data: next });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: data.action === "DELETE_PROGRAM" ? "DELETE" : "UPDATE", module: "training", entityType: "TrainingProgram", entityId: item.id, previousValue: { status: item.status }, newValue: next } });
    }
    if (data.action === "ADD_PARTICIPANT") {
      if (!data.trainingProgramId || !data.employeeId) throw new Error("REQUIRED");
      const [program, employee] = await Promise.all([
        db.trainingProgram.findFirstOrThrow({ where: tenantTrainingRecord(tenant.companyId, data.trainingProgramId) }),
        db.employee.findFirstOrThrow({ where: { id: data.employeeId, companyId: tenant.companyId, deletedAt: null, employmentStatus: "ACTIVE" } }),
      ]);
      const activeCount = await db.trainingParticipant.count({ where: { trainingProgramId: program.id, companyId: tenant.companyId, deletedAt: null } });
      if (program.capacity && activeCount >= program.capacity) throw new Error("CAPACITY");
      const previous = await db.trainingParticipant.findUnique({ where: { trainingProgramId_employeeId: { trainingProgramId: program.id, employeeId: employee.id } } });
      if (previous && !previous.deletedAt) throw new Error("DUPLICATE_PARTICIPANT");
      const item = previous ? await db.trainingParticipant.update({ where: { id: previous.id }, data: { deletedAt: null, attendanceStatus: "REGISTERED", completionStatus: "PENDING" } }) : await db.trainingParticipant.create({ data: { companyId: tenant.companyId, trainingProgramId: program.id, employeeId: employee.id } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: previous ? "RESTORE" : "CREATE", module: "training", entityType: "TrainingParticipant", entityId: item.id, newValue: { trainingProgramId: program.id, employeeId: employee.id } } });
    }
    if (data.action === "UPDATE_PARTICIPANT" || data.action === "DELETE_PARTICIPANT") {
      const item = await db.trainingParticipant.findFirstOrThrow({ where: tenantTrainingRecord(tenant.companyId, data.id ?? "") });
      const next = data.action === "DELETE_PARTICIPANT" ? { deletedAt: new Date() } : { attendanceStatus: attendanceStatuses.includes(data.attendanceStatus as never) ? data.attendanceStatus : item.attendanceStatus, completionStatus: completionStatuses.includes(data.completionStatus as never) ? data.completionStatus : item.completionStatus, score: data.score ?? null, certificateNumber: clean(data.certificateNumber), certificateUrl: clean(data.certificateUrl), notes: clean(data.notes) };
      await db.trainingParticipant.update({ where: { id: item.id }, data: next });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId, action: data.action === "DELETE_PARTICIPANT" ? "DELETE" : "UPDATE", module: "training", entityType: "TrainingParticipant", entityId: item.id, previousValue: { attendanceStatus: item.attendanceStatus, completionStatus: item.completionStatus, score: item.score }, newValue: next } });
    }
    return NextResponse.redirect(new URL("/training?saved=1", appUrl(req)), 303);
  } catch (error) { return NextResponse.redirect(new URL(`/training?error=${encodeURIComponent(error instanceof Error ? error.message : "FAILED")}`, appUrl(req)), 303); }
}
