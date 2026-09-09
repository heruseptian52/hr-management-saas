import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["CREATE", "APPROVE", "REJECT", "CANCEL", "DELETE"]),
  id: z.string().optional(), employeeId: z.string().optional(), typeName: z.string().trim().max(100).optional(),
  startDate: z.string().optional(), endDate: z.string().optional(), reason: z.string().trim().max(500).optional(), reviewNotes: z.string().trim().max(500).optional(),
});
const day = 86_400_000;

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.parse(Object.fromEntries(await request.formData()));
    const permission = parsed.action === "CREATE" ? "create" : parsed.action === "DELETE" ? "delete" : parsed.action === "CANCEL" ? "edit" : "approve";
    const tenant = await requirePermission("attendance", permission);
    if (parsed.action === "CREATE") {
      if (!parsed.employeeId || !parsed.typeName || !parsed.startDate || !parsed.endDate) throw new Error("INVALID");
      const startDate = new Date(`${parsed.startDate}T00:00:00.000Z`), endDate = new Date(`${parsed.endDate}T00:00:00.000Z`);
      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate < startDate) throw new Error("DATE");
      const [employee, leaveType] = await Promise.all([
        db.employee.findFirst({ where: { id: parsed.employeeId, companyId: tenant.companyId, deletedAt: null } }),
        db.masterData.findFirst({ where: { companyId: tenant.companyId, category: "LEAVE_TYPE", name: { equals: parsed.typeName, mode: "insensitive" }, isActive: true, deletedAt: null } }),
      ]);
      if (!employee || !leaveType) throw new Error("TENANT_DATA");
      const overlap = await db.leaveRequest.count({ where: { companyId: tenant.companyId, employeeId: employee.id, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: endDate }, endDate: { gte: startDate } } });
      if (overlap) return NextResponse.redirect(new URL("/leave-requests?error=overlap", appUrl(request)), 303);
      const data = { companyId: tenant.companyId, employeeId: employee.id, typeName: leaveType.name, startDate, endDate, totalDays: Math.floor((endDate.getTime() - startDate.getTime()) / day) + 1, reason: parsed.reason || null };
      const item = await db.leaveRequest.create({ data });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "leave_requests", entityType: "LeaveRequest", entityId: item.id, newValue: { ...data, startDate: parsed.startDate, endDate: parsed.endDate } } });
    } else {
      const item = await db.leaveRequest.findFirstOrThrow({ where: { id: parsed.id, companyId: tenant.companyId } });
      if (["APPROVE", "REJECT"].includes(parsed.action) && item.status !== "PENDING") throw new Error("STATUS");
      const nextStatus = parsed.action === "APPROVE" ? "APPROVED" : parsed.action === "REJECT" ? "REJECTED" : parsed.action === "CANCEL" ? "CANCELLED" : null;
      if (parsed.action === "DELETE") await db.leaveRequest.delete({ where: { id: item.id } });
      else await db.leaveRequest.update({ where: { id: item.id }, data: { status: nextStatus!, reviewedById: tenant.session.userId, reviewNotes: parsed.reviewNotes || null, reviewedAt: new Date() } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: parsed.action, module: "leave_requests", entityType: "LeaveRequest", entityId: item.id, previousValue: { status: item.status }, newValue: { status: nextStatus, reviewNotes: parsed.reviewNotes || null } } });
    }
    return NextResponse.redirect(new URL("/leave-requests?saved=1", appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL("/leave-requests?error=1", appUrl(request)), 303); }
}
