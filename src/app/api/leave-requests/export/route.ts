import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requirePermission("attendance", "export"), status = request.nextUrl.searchParams.get("status") ?? "", employeeId = request.nextUrl.searchParams.get("employeeId") ?? "";
    if (employeeId && !(await db.employee.count({ where: { id: employeeId, companyId: tenant.companyId, deletedAt: null } }))) return new Response("Karyawan tidak valid", { status: 400 });
    const data = await db.leaveRequest.findMany({ where: { companyId: tenant.companyId, ...(status ? { status } : {}), ...(employeeId ? { employeeId } : {}) }, include: { employee: { include: { department: true, position: true } } }, orderBy: [{ startDate: "desc" }, { employee: { fullName: "asc" } }] });
    const rows = [["ID Karyawan", "Nama", "Departemen", "Jabatan", "Jenis", "Mulai", "Selesai", "Jumlah Hari", "Status", "Alasan", "Catatan Review"], ...data.map(x => [x.employee.employeeNumber, x.employee.fullName, x.employee.department?.name ?? "", x.employee.position?.name ?? "", x.typeName, x.startDate.toISOString().slice(0, 10), x.endDate.toISOString().slice(0, 10), x.totalDays, x.status, x.reason ?? "", x.reviewNotes ?? ""])];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, [18, 28, 22, 22, 20, 14, 14, 14, 15, 32, 32]), "Cuti dan Izin");
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "EXPORT", module: "leave_requests", newValue: { rows: data.length, status: status || null, employeeId: employeeId || null } } });
    return workbookResponse(workbook, "cuti-izin-karyawan.xlsx");
  } catch { return new Response("Forbidden", { status: 403 }); }
}
