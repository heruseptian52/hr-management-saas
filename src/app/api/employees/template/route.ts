import { requirePermission } from "@/lib/authorization";
import { employeeFields, styledSheet, workbookResponse } from "@/lib/excel";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    await requirePermission("employees", "view");
    const workbook = XLSX.utils.book_new();
    const headers = employeeFields.map(([, label]) => label);
    const data = [headers, ["Budi Santoso", "EMP001", "Kasir", "Operasional", "08123456789", "budi@email.com", "2026-08-01", "Tetap", "Pagi", "Kantor Pusat", "Aktif"], ["Siti Aminah", "EMP002", "Supervisor", "Operasional", "08123456780", "", "2026-08-05", "Kontrak", "Siang", "Kantor Pusat", "Aktif"]];
    XLSX.utils.book_append_sheet(workbook, styledSheet(data, [24, 24, 20, 22, 18, 26, 16, 18, 14, 20, 18]), "DATA");
    const help = [["Kolom", "Wajib", "Format / Petunjuk", "Contoh"], ...employeeFields.map(([field, label]) => [label, field === "fullName" ? "YA" : "Tidak", field === "joinDate" ? "YYYY-MM-DD" : "Teks", data[1][headers.indexOf(label)]])];
    XLSX.utils.book_append_sheet(workbook, styledSheet(help, [28, 12, 35, 26]), "PETUNJUK");
    return workbookResponse(workbook, "template-karyawan-panboy-hr.xlsx");
  } catch { return new Response("Forbidden", { status: 403 }); }
}
