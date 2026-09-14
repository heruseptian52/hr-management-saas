import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { requireSuperAdmin } from "@/lib/platform";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(), query = request.nextUrl.searchParams;
    const module = query.get("module") || "", action = query.get("action") || "", companyId = query.get("companyId") || "", from = query.get("from") || "", to = query.get("to") || "";
    const logs = await db.auditLog.findMany({ where: { ...(module ? { module } : {}), ...(action ? { action } : {}), ...(companyId ? { companyId } : {}), ...((from || to) ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}) }, include: { actor: { select: { fullName: true, email: true } }, company: { select: { name: true, code: true } } }, orderBy: { createdAt: "desc" }, take: 10000 });
    const rows: unknown[][] = [["Waktu", "Perusahaan", "Kode", "Admin", "Email", "Modul", "Aksi", "Entitas", "ID Entitas", "Alamat IP"]];
    logs.forEach(log => rows.push([log.createdAt.toISOString(), log.company?.name ?? "Platform", log.company?.code ?? "-", log.actor?.fullName ?? "System", log.actor?.email ?? "", log.module, log.action, log.entityType ?? "", log.entityId ?? "", log.ipAddress ?? ""]));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, [24,28,16,26,30,18,20,22,28,18]), "Audit Log");
    await db.auditLog.create({ data: { actorUserId: session.userId, action: "EXPORT", module: "audit", entityType: "AuditLog", newValue: { rows: logs.length, filters: { module, action, companyId, from, to } } } });
    return workbookResponse(workbook, `audit-platform-${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch { return new Response("Tidak diizinkan", { status: 403 }); }
}
