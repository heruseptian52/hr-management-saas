import { requirePermission } from "@/lib/authorization";
import { styledSheet, workbookResponse } from "@/lib/excel";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    await requirePermission("schedules", "create");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, styledSheet([
      ["Tanggal", "ID Karyawan", "Nama Karyawan", "Shift", "Status", "Keterangan"],
      ["2026-09-01", "EMP-0001", "Budi Santoso", "P", "KERJA", ""],
      ["2026-09-02", "EMP-0001", "Budi Santoso", "LIBUR", "LIBUR", "Libur mingguan"],
    ], [16, 18, 28, 16, 14, 32]), "DATA");
    XLSX.utils.book_append_sheet(workbook, styledSheet([
      ["Kolom", "Wajib", "Petunjuk"],
      ["Tanggal", "Ya", "YYYY-MM-DD atau DD/MM/YYYY; harus berada pada bulan jadwal"],
      ["ID Karyawan", "Salah satu", "Paling aman untuk mencocokkan karyawan"],
      ["Nama Karyawan", "Salah satu", "Dipakai jika ID karyawan kosong"],
      ["Shift", "Ya", "Isi kode/nama shift perusahaan atau LIBUR"],
      ["Status", "Tidak", "KERJA atau LIBUR; otomatis LIBUR jika Shift berisi LIBUR"],
      ["Keterangan", "Tidak", "Catatan jadwal"],
    ], [22, 14, 70]), "PETUNJUK");
    return workbookResponse(workbook, "template-jadwal-panboy-hr.xlsx");
  } catch { return new Response("Tidak diizinkan", { status: 403 }); }
}
