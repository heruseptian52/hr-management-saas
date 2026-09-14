import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ employeeId: z.string().min(1), typeName: z.string().trim().min(1).max(100), year: z.coerce.number().int().min(2000).max(2100), entitledDays: z.coerce.number().int().min(0).max(366), carriedDays: z.coerce.number().int().min(0).max(366), notes: z.string().trim().max(300).optional() });
export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("attendance", "edit"), data = schema.parse(Object.fromEntries(await request.formData()));
    const [employee, type] = await Promise.all([
      db.employee.findFirst({ where: { id: data.employeeId, companyId: tenant.companyId, deletedAt: null }, select: { id: true } }),
      db.masterData.findFirst({ where: { companyId: tenant.companyId, category: "LEAVE_TYPE", name: { equals: data.typeName, mode: "insensitive" }, isActive: true, deletedAt: null }, select: { name: true } }),
    ]);
    if (!employee || !type) throw new Error("TENANT");
    const previous = await db.leaveBalance.findUnique({ where: { companyId_employeeId_typeName_year: { companyId: tenant.companyId, employeeId: employee.id, typeName: type.name, year: data.year } } });
    const item = await db.leaveBalance.upsert({ where: { companyId_employeeId_typeName_year: { companyId: tenant.companyId, employeeId: employee.id, typeName: type.name, year: data.year } }, create: { companyId: tenant.companyId, employeeId: employee.id, typeName: type.name, year: data.year, entitledDays: data.entitledDays, carriedDays: data.carriedDays, notes: data.notes || null }, update: { entitledDays: data.entitledDays, carriedDays: data.carriedDays, notes: data.notes || null } });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: previous ? "UPDATE" : "CREATE", module: "leave_balances", entityType: "LeaveBalance", entityId: item.id, previousValue: previous ? { entitledDays: previous.entitledDays, carriedDays: previous.carriedDays, notes: previous.notes } : undefined, newValue: { employeeId: employee.id, typeName: type.name, year: data.year, entitledDays: data.entitledDays, carriedDays: data.carriedDays, notes: data.notes || null } } });
    return NextResponse.redirect(new URL(`/leave-balances?year=${data.year}&saved=1`, appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL("/leave-balances?error=1", appUrl(request)), 303); }
}
