import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ employeeId: z.string().cuid() });

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "delete");
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return NextResponse.redirect(new URL("/employees?error=delete_validation", appUrl(request)), 303);

    const employee = await db.employee.findFirst({
      where: { id: parsed.data.employeeId, companyId: tenant.companyId, deletedAt: null },
      select: { id: true, employeeNumber: true, fullName: true }
    });
    if (!employee) return NextResponse.redirect(new URL("/employees?error=not_found", appUrl(request)), 303);

    const now = new Date();
    await db.employee.update({ where: { id: employee.id }, data: { deletedAt: now } });
    await db.auditLog.create({ data: {
      companyId: tenant.companyId,
      actorUserId: tenant.session.userId,
      action: "SOFT_DELETE",
      module: "employees",
      entityType: "Employee",
      entityId: employee.id,
      previousValue: { employeeNumber: employee.employeeNumber, fullName: employee.fullName },
      newValue: { deletedAt: now.toISOString() }
    } }).catch((auditError) => console.error("EMPLOYEE_DELETE_AUDIT", auditError));
    return NextResponse.redirect(new URL("/employees?deleted=1", appUrl(request)), 303);
  } catch (error) {
    console.error("EMPLOYEE_DELETE", error);
    return NextResponse.redirect(new URL("/employees?error=delete_failed", appUrl(request)), 303);
  }
}
