import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  employeeIds: z.array(z.string().cuid()).min(1).max(500),
  action: z.enum(["STATUS", "POSITION", "DEPARTMENT", "BRANCH", "DELETE"]),
  value: z.string().max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.parse(await request.json());
    const tenant = await requirePermission("employees", parsed.action === "DELETE" ? "delete" : "edit");
    const employees = await db.employee.findMany({ where: { id: { in: parsed.employeeIds }, companyId: tenant.companyId, deletedAt: null }, select: { id: true } });
    if (!employees.length || employees.length !== new Set(parsed.employeeIds).size) return NextResponse.json({ error: "Sebagian karyawan tidak ditemukan di perusahaan aktif" }, { status: 400 });
    let data: { employmentStatus?: "ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED"; positionId?: string; departmentId?: string; branchId?: string; deletedAt?: Date } = {};
    if (parsed.action === "STATUS") {
      if (!["ACTIVE", "INACTIVE", "RESIGNED", "TERMINATED"].includes(parsed.value ?? "")) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
      data = { employmentStatus: parsed.value as typeof data.employmentStatus };
    }
    if (["POSITION", "DEPARTMENT", "BRANCH"].includes(parsed.action)) {
      if (!parsed.value) return NextResponse.json({ error: "Pilih data tujuan" }, { status: 400 });
      const valid = parsed.action === "POSITION"
        ? await db.position.count({ where: { id: parsed.value, companyId: tenant.companyId, deletedAt: null } })
        : parsed.action === "DEPARTMENT"
          ? await db.department.count({ where: { id: parsed.value, companyId: tenant.companyId, deletedAt: null } })
          : await db.branch.count({ where: { id: parsed.value, companyId: tenant.companyId, deletedAt: null } });
      if (!valid) return NextResponse.json({ error: "Tujuan tidak tersedia di perusahaan aktif" }, { status: 400 });
      data = parsed.action === "POSITION" ? { positionId: parsed.value } : parsed.action === "DEPARTMENT" ? { departmentId: parsed.value } : { branchId: parsed.value };
    }
    if (parsed.action === "DELETE") data = { deletedAt: new Date() };
    const result = await db.$transaction(async tx => {
      const updated = await tx.employee.updateMany({ where: { id: { in: parsed.employeeIds }, companyId: tenant.companyId, deletedAt: null }, data });
      await tx.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: parsed.action === "DELETE" ? "BULK_SOFT_DELETE" : "BULK_UPDATE", module: "employees", entityType: "Employee", newValue: { employeeIds: parsed.employeeIds, action: parsed.action, value: parsed.value ?? null, affected: updated.count } } });
      return updated;
    });
    return NextResponse.json({ ok: true, affected: result.count });
  } catch (error) {
    console.error("EMPLOYEE_BULK", error);
    return NextResponse.json({ error: "Perubahan massal gagal. Periksa izin dan pilihan Anda." }, { status: 400 });
  }
}
