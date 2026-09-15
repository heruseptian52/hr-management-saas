import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const tenant = await requirePermission("training", "export");
    const programs = await db.trainingProgram.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, include: { participants: { where: { deletedAt: null }, include: { employee: { include: { department: true, position: true } } } } }, orderBy: { startDate: "desc" } });
    const rows: unknown[][] = [["Kode", "Pelatihan", "Kategori", "Mulai", "Selesai", "Status", "ID Karyawan", "Nama", "Departemen", "Jabatan", "Kehadiran", "Kelulusan", "Nilai", "No Sertifikat", "Link Sertifikat"]];
    for (const program of programs) {
      if (!program.participants.length) rows.push([program.code, program.name, program.category ?? "", program.startDate.toISOString().slice(0, 10), program.endDate.toISOString().slice(0, 10), program.status]);
      for (const item of program.participants) rows.push([program.code, program.name, program.category ?? "", program.startDate.toISOString().slice(0, 10), program.endDate.toISOString().slice(0, 10), program.status, item.employee.employeeNumber, item.employee.fullName, item.employee.department?.name ?? "", item.employee.position?.name ?? "", item.attendanceStatus, item.completionStatus, item.score ?? "", item.certificateNumber ?? "", item.certificateUrl ?? ""]);
    }
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, [14, 28, 18, 13, 13, 13, 18, 28, 22, 22, 14, 14, 10, 20, 35]), "Pelatihan");
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "EXPORT", module: "training", newValue: { programs: programs.length, rows: rows.length - 1 } } });
    return workbookResponse(workbook, "pelatihan-karyawan.xlsx");
  } catch { return new Response("Forbidden", { status: 403 }); }
}
