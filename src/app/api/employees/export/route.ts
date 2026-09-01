import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "export"), q = request.nextUrl.searchParams.get("q")?.trim(), status = request.nextUrl.searchParams.get("status");
    const employees = await db.employee.findMany({ where: { companyId: tenant.companyId, deletedAt: null, ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { employeeNumber: { contains: q, mode: "insensitive" } }] } : {}), ...(status && status !== "ALL" ? { employmentStatus: status as "ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED" } : {}) }, include: { branch: true, department: true, position: true }, orderBy: { fullName: "asc" } });
    const rows = [["Nama Karyawan", "ID Karyawan", "NIK / No KTP", "Jabatan", "Divisi / Departemen", "Nomor Telepon", "Email", "Tanggal Masuk", "Berakhir Kontrak", "Tanggal Berhenti", "Tempat Lahir", "Tanggal Lahir", "Alamat", "Status Keaktifan", "Status Pernikahan", "Agama", "Jenis Kerja", "Cabang"], ...employees.map(item => [item.fullName, item.employeeNumber, item.nationalId ?? "", item.position?.name ?? "", item.department?.name ?? "", item.phone ?? "", item.email ?? "", item.joinDate?.toISOString().slice(0, 10) ?? "", item.contractEndDate?.toISOString().slice(0, 10) ?? "", item.stopDate?.toISOString().slice(0, 10) ?? "", item.placeOfBirth ?? "", item.birthDate?.toISOString().slice(0, 10) ?? "", item.address ?? "", item.employeeStatusLabel ?? item.employmentStatus, item.maritalStatus ?? "", item.religion ?? "", item.employmentType ?? "", item.branch?.name ?? ""] )];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, [25, 18, 20, 22, 22, 24, 28, 16, 16, 16, 18, 16, 32, 18, 18, 18, 18, 22]), "Data Karyawan");
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "EXPORT", module: "employees", newValue: { rows: employees.length, filtered: Boolean(q || status) } } });
    return workbookResponse(workbook, `data-karyawan-${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch { return new Response("Forbidden", { status: 403 }); }
}
