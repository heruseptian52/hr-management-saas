import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "view"), batchId = request.nextUrl.searchParams.get("batchId") ?? "";
    const batch = await db.importBatch.findFirstOrThrow({ where: { id: batchId, companyId: tenant.companyId } });
    const errors = Array.isArray(batch.errorData) ? batch.errorData as Array<Record<string, unknown>> : [];
    const headers = Array.from(new Set(errors.flatMap(item => Object.keys((item.original as Record<string, unknown>) ?? {}))));
    const rows = [headers.concat("ERROR"), ...errors.map(item => headers.map(header => ((item.original as Record<string, unknown>) ?? {})[header] ?? "").concat([...(item.errors as string[] ?? []), ...(item.warnings as string[] ?? [])].join("; ")))];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, headers.map(() => 20).concat(40)), "Data Error");
    return workbookResponse(workbook, `error-import-${batch.id}.xlsx`);
  } catch { return new Response("File error tidak tersedia", { status: 404 }); }
}
