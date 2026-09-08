import { requirePermission } from "@/lib/authorization";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { masterDataCategories } from "@/lib/master-data";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");
    if (!category || !masterDataCategories.includes(category as never)) throw new Error();
    try { await requirePermission("master_data", "create"); } catch { await requirePermission("employees", "edit"); }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, styledSheet([["Kode", "Nama", "Warna", "Urutan", "Status"], [`${category.slice(0, 3)}-01`, "Contoh Data", "#2563EB", 1, "Aktif"]], [20, 30, 15, 12, 15]), "DATA");
    XLSX.utils.book_append_sheet(workbook, styledSheet([["Kolom", "Wajib", "Keterangan"], ["Nama", "Ya", "Nama data bisnis"], ["Kode", "Tidak", "Otomatis dibuat jika kosong"], ["Warna", "Tidak", "Format #RRGGBB"], ["Urutan", "Tidak", "Angka 0-999"], ["Status", "Tidak", "Aktif/Nonaktif"]], [20, 12, 55]), "PETUNJUK");
    return workbookResponse(workbook, `template-${category.toLowerCase()}-panboy-hr.xlsx`);
  } catch { return new Response("Tidak diizinkan", { status: 403 }); }
}
