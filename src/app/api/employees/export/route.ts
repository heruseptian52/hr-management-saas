import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "export"), q = request.nextUrl.searchParams.get("q")?.trim(), status = request.nextUrl.searchParams.get("status");
    const employees = await db.employee.findMany({ where: { companyId: tenant.companyId, deletedAt: null, ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { employeeNumber: { contains: q, mode: "insensitive" } }] } : {}), ...(status && status !== "ALL" ? { employmentStatus: status as "ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED" } : {}) }, include: { branch: true, department: true, position: true }, orderBy: { fullName: "asc" } });
    const rows = [["Nama Karyawan", "NIK Internal", "Jabatan", "Divisi / Departemen", "Nomor HP", "Email", "Tanggal Masuk", "Jenis Kerja", "Cabang", "Status"], ...employees.map(item => [item.fullName, item.employeeNumber, item.position?.name ?? "", item.department?.name ?? "", item.phone ?? "", item.email ?? "", item.joinDate.toISOString().slice(0, 10), item.employmentType, item.branch?.name ?? "", item.employmentStatus])];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, [25, 18, 20, 22, 18, 28, 16, 18, 22, 16]), "Data Karyawan");
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "EXPORT", module: "employees", newValue: { rows: employees.length, filtered: Boolean(q || status) } } });
    return workbookResponse(workbook, `data-karyawan-${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch { return new Response("Forbidden", { status: 403 }); }
}
