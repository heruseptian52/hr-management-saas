import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  employeeNumber: z.string().trim().toUpperCase().min(2).max(30), fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().or(z.literal("")), phone: z.string().trim().max(30), joinDate: z.coerce.date(),
  branchId: z.string().cuid().or(z.literal("")), departmentId: z.string().cuid().or(z.literal("")), positionId: z.string().cuid().or(z.literal("")),
  employmentType: z.enum(["PERMANENT", "CONTRACT", "INTERNSHIP", "FREELANCE", "PART_TIME"]), monthlyDaysOff: z.coerce.number().int().min(0).max(31),
});

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "create");
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return NextResponse.redirect(new URL("/employees?error=validation", appUrl(request)), 303);
    const relationIds = [parsed.data.branchId, parsed.data.departmentId, parsed.data.positionId].filter(Boolean);
    const [branchCount, departmentCount, positionCount] = await Promise.all([
      parsed.data.branchId ? db.branch.count({ where: { id: parsed.data.branchId, companyId: tenant.companyId, deletedAt: null } }) : 1,
      parsed.data.departmentId ? db.department.count({ where: { id: parsed.data.departmentId, companyId: tenant.companyId, deletedAt: null } }) : 1,
      parsed.data.positionId ? db.position.count({ where: { id: parsed.data.positionId, companyId: tenant.companyId, deletedAt: null } }) : 1,
    ]);
    if (relationIds.length && [branchCount, departmentCount, positionCount].includes(0)) throw new Error("CROSS_TENANT_RELATION");
    const data = { ...parsed.data, companyId: tenant.companyId, email: parsed.data.email || null, phone: parsed.data.phone || null, branchId: parsed.data.branchId || null, departmentId: parsed.data.departmentId || null, positionId: parsed.data.positionId || null };
    const employee = await db.employee.create({ data });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "employees", entityType: "Employee", entityId: employee.id, newValue: { employeeNumber: employee.employeeNumber, fullName: employee.fullName } } });
    return NextResponse.redirect(new URL("/employees?saved=1", appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/employees?error=duplicate", appUrl(request)), 303);
  }
}

