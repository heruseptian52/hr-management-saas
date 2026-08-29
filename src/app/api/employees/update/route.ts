import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  employeeId: z.string().cuid(), fullName: z.string().trim().min(2).max(120), email: z.string().trim().email().or(z.literal("")), phone: z.string().trim().max(30),
  branchId: z.string().cuid().or(z.literal("")), departmentId: z.string().cuid().or(z.literal("")), positionId: z.string().cuid().or(z.literal("")),
  employmentType: z.enum(["PERMANENT", "CONTRACT", "INTERNSHIP", "FREELANCE", "PART_TIME"]), employmentStatus: z.enum(["ACTIVE", "INACTIVE", "RESIGNED", "TERMINATED"]), monthlyDaysOff: z.coerce.number().int().min(0).max(31),
});

export async function POST(request: NextRequest) {
  let employeeId = "";
  try {
    const tenant = await requirePermission("employees", "edit");
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return NextResponse.redirect(new URL("/employees?error=validation", request.url), 303);
    employeeId = parsed.data.employeeId;
    const previous = await db.employee.findFirstOrThrow({ where: { id: employeeId, companyId: tenant.companyId, deletedAt: null } });
    const [branchCount, departmentCount, positionCount] = await Promise.all([
      parsed.data.branchId ? db.branch.count({ where: { id: parsed.data.branchId, companyId: tenant.companyId, deletedAt: null } }) : 1,
      parsed.data.departmentId ? db.department.count({ where: { id: parsed.data.departmentId, companyId: tenant.companyId, deletedAt: null } }) : 1,
      parsed.data.positionId ? db.position.count({ where: { id: parsed.data.positionId, companyId: tenant.companyId, deletedAt: null } }) : 1,
    ]);
    if ([branchCount, departmentCount, positionCount].includes(0)) throw new Error("CROSS_TENANT_RELATION");
    const { employeeId: _, ...values } = parsed.data;
    const data = { ...values, email: values.email || null, phone: values.phone || null, branchId: values.branchId || null, departmentId: values.departmentId || null, positionId: values.positionId || null };
    await db.$transaction([
      db.employee.update({ where: { id: previous.id }, data }),
      db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "UPDATE", module: "employees", entityType: "Employee", entityId: previous.id, previousValue: { fullName: previous.fullName, email: previous.email, phone: previous.phone, employmentType: previous.employmentType, employmentStatus: previous.employmentStatus, monthlyDaysOff: previous.monthlyDaysOff, branchId: previous.branchId, departmentId: previous.departmentId, positionId: previous.positionId }, newValue: data } }),
    ]);
    return NextResponse.redirect(new URL(`/employees/${previous.id}?saved=1`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(employeeId ? `/employees/${employeeId}?error=1` : "/employees?error=validation", request.url), 303);
  }
}

