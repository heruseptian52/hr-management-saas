import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({ action: z.literal("request"), scheduleId: z.string().cuid(), fromAssignmentId: z.string().cuid(), toAssignmentId: z.string().cuid(), reason: z.string().trim().max(300), returnMonth: z.string().regex(/^\d{4}-\d{2}$/) });
const reviewSchema = z.object({ action: z.enum(["approve", "reject"]), requestId: z.string().cuid(), reviewNotes: z.string().trim().max(300), returnMonth: z.string().regex(/^\d{4}-\d{2}$/) });

export async function POST(request: NextRequest) {
  let month = new Date().toISOString().slice(0, 7);
  try {
    const form = Object.fromEntries(await request.formData());
    const action = String(form.action);
    if (action === "request") {
      const tenant = await requirePermission("schedules", "edit"), parsed = requestSchema.parse(form); month = parsed.returnMonth;
      if (parsed.fromAssignmentId === parsed.toAssignmentId) throw new Error("SAME_ASSIGNMENT");
      const assignments = await db.scheduleAssignment.findMany({ where: { id: { in: [parsed.fromAssignmentId, parsed.toAssignmentId] }, companyId: tenant.companyId, scheduleId: parsed.scheduleId, schedule: { status: { in: ["DRAFT", "PUBLISHED"] } } } });
      if (assignments.length !== 2 || assignments[0].employeeId === assignments[1].employeeId) throw new Error("INVALID_ASSIGNMENTS");
      const existing = await db.scheduleSwapRequest.count({ where: { companyId: tenant.companyId, scheduleId: parsed.scheduleId, status: "PENDING", OR: [{ fromAssignmentId: { in: [parsed.fromAssignmentId, parsed.toAssignmentId] } }, { toAssignmentId: { in: [parsed.fromAssignmentId, parsed.toAssignmentId] } }] } });
      if (existing) throw new Error("PENDING_EXISTS");
      const swap = await db.scheduleSwapRequest.create({ data: { companyId: tenant.companyId, scheduleId: parsed.scheduleId, requesterUserId: tenant.session.userId, fromAssignmentId: parsed.fromAssignmentId, toAssignmentId: parsed.toAssignmentId, reason: parsed.reason || null } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "REQUEST_SWAP", module: "schedules", entityType: "ScheduleSwapRequest", entityId: swap.id, newValue: { fromAssignmentId: parsed.fromAssignmentId, toAssignmentId: parsed.toAssignmentId } } });
      return NextResponse.redirect(new URL(`/schedules?month=${month}&saved=swap_requested`, request.url), 303);
    }
    const tenant = await requirePermission("schedules", "approve"), parsed = reviewSchema.parse(form); month = parsed.returnMonth;
    const swap = await db.scheduleSwapRequest.findFirstOrThrow({ where: { id: parsed.requestId, companyId: tenant.companyId, status: "PENDING" } });
    if (parsed.action === "reject") {
      await db.$transaction([
        db.scheduleSwapRequest.update({ where: { id: swap.id }, data: { status: "REJECTED", reviewedByUserId: tenant.session.userId, reviewNotes: parsed.reviewNotes || null, reviewedAt: new Date() } }),
        db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "REJECT_SWAP", module: "schedules", entityType: "ScheduleSwapRequest", entityId: swap.id } }),
      ]);
    } else {
      const [from, to] = await Promise.all([
        db.scheduleAssignment.findFirstOrThrow({ where: { id: swap.fromAssignmentId, companyId: tenant.companyId, scheduleId: swap.scheduleId, schedule: { status: { in: ["DRAFT", "PUBLISHED"] } } } }),
        db.scheduleAssignment.findFirstOrThrow({ where: { id: swap.toAssignmentId, companyId: tenant.companyId, scheduleId: swap.scheduleId, schedule: { status: { in: ["DRAFT", "PUBLISHED"] } } } }),
      ]);
      await db.$transaction([
        db.scheduleAssignment.update({ where: { id: from.id }, data: { shiftId: to.shiftId, type: to.type } }),
        db.scheduleAssignment.update({ where: { id: to.id }, data: { shiftId: from.shiftId, type: from.type } }),
        db.scheduleSwapRequest.update({ where: { id: swap.id }, data: { status: "APPROVED", reviewedByUserId: tenant.session.userId, reviewNotes: parsed.reviewNotes || null, reviewedAt: new Date() } }),
        db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "APPROVE_SWAP", module: "schedules", entityType: "ScheduleSwapRequest", entityId: swap.id, newValue: { fromAssignmentId: from.id, toAssignmentId: to.id } } }),
      ]);
    }
    return NextResponse.redirect(new URL(`/schedules?month=${month}&saved=swap_reviewed`, request.url), 303);
  } catch { return NextResponse.redirect(new URL(`/schedules?month=${month}&error=swap`, request.url), 303); }
}
