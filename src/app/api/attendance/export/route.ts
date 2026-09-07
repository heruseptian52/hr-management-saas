import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requirePermission("attendance", "export");
    const params = request.nextUrl.searchParams;
    const date = params.get("date") ?? "";
    const start = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const rowsData = await db.attendance.findMany({ where: { companyId: tenant.companyId, workDate: { gte: start, lt: end } }, include: { employee: { include: { department: true, position: true } }, branch: true }, orderBy: { employee: { fullName: "asc" } } });
    const rows = [["Tanggal", "ID Karyawan", "Nama", "Departemen", "Jabatan", "Status", "Check-in", "Check-out", "Metode", "Cabang", "Catatan"], ...rowsData.map(item => [item.workDate.toISOString().slice(0, 10), item.employee.employeeNumber, item.employee.fullName, item.employee.department?.name ?? "", item.employee.position?.name ?? "", item.status, item.checkInAt?.toISOString().slice(11, 16) ?? "", item.checkOutAt?.toISOString().slice(11, 16) ?? "", item.method, item.branch?.name ?? "", item.notes ?? ""] )];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, [14, 18, 28, 22, 22, 18, 12, 12, 14, 22, 32]), "Data Absensi");
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "EXPORT", module: "attendance", newValue: { rows: rowsData.length, date: start.toISOString().slice(0, 10) } } });
    return workbookResponse(workbook, `data-absensi-${start.toISOString().slice(0, 10)}.xlsx`);
  } catch { return new Response("Forbidden", { status: 403 }); }
}
