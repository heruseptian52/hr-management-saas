import { requirePermission } from "@/lib/authorization";
import { employeeFields, styledSheet, workbookResponse } from "@/lib/excel";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    await requirePermission("employees", "view");
    const workbook = XLSX.utils.book_new();
    const headers = employeeFields.map(([, label]) => label);
    const sample: Record<string, string> = { fullName: "Contoh Karyawan 001", employeeNumber: "CONTOH001", nationalId: "0000000000000000", joinDate: "17 JANUARI 2025", contractEndDate: "31 DESEMBER 2026", employeeStatusLabel: "Aktif", position: "Kasir", department: "Operasional", placeOfBirth: "Kota Contoh", birthDate: "21 FEBRUARI 2000", address: "Alamat contoh", maritalStatus: "Lajang", religion: "Islam", phone: "080000000000", email: "karyawan001@example.invalid", employmentType: "Kontrak", shift: "Pagi", branch: "Kantor Pusat" };
    const data = [headers, employeeFields.map(([field]) => sample[field] ?? ""), employeeFields.map(([field]) => field === "fullName" ? "Contoh Karyawan 002" : field === "position" ? "Supervisor" : "")];
    XLSX.utils.book_append_sheet(workbook, styledSheet(data, employeeFields.map(([, label]) => Math.max(16, Math.min(30, label.length + 5)))), "DATA");
    const help = [["Kolom", "Wajib", "Format / Petunjuk", "Contoh"], ...employeeFields.map(([field, label]) => [label, field === "fullName" ? "YA" : "Tidak", ["joinDate", "contractEndDate", "stopDate", "birthDate"].includes(field) ? "Tanggal Excel, DD-MM-YYYY, atau nama bulan Indonesia" : field === "nationalId" ? "Teks; NIK normal 16 digit" : "Teks; boleh kosong", sample[field] ?? ""] )];
    XLSX.utils.book_append_sheet(workbook, styledSheet(help, [28, 12, 35, 26]), "PETUNJUK");
    return workbookResponse(workbook, "template-karyawan-panboy-hr.xlsx");
  } catch { return new Response("Forbidden", { status: 403 }); }
}
