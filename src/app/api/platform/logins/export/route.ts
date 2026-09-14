import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { styledSheet, workbookResponse } from "@/lib/excel";
import { requireSuperAdmin } from "@/lib/platform";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(), query = request.nextUrl.searchParams;
    const status = query.get("status") || "", email = query.get("email") || "", from = query.get("from") || "", to = query.get("to") || "";
    const items = await db.loginHistory.findMany({ where: { ...(status === "success" ? { success: true } : status === "failed" ? { success: false } : {}), ...(email ? { user: { email: { contains: email, mode: "insensitive" } } } : {}), ...((from || to) ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}) }, include: { user: { select: { fullName: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 10000 });
    const rows: unknown[][] = [["Waktu", "Nama", "Email", "Status", "Alamat IP", "Perangkat / Browser"]]; items.forEach(item => rows.push([item.createdAt.toISOString(), item.user.fullName, item.user.email, item.success ? "Berhasil" : "Gagal", item.ipAddress ?? "", item.userAgent ?? ""]));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, styledSheet(rows, [24,26,30,14,18,55]), "Riwayat Login");
    await db.auditLog.create({ data: { actorUserId: session.userId, action: "EXPORT", module: "security", entityType: "LoginHistory", newValue: { rows: items.length, filters: { status, email, from, to } } } });
    return workbookResponse(workbook, `riwayat-login-${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch { return new Response("Tidak diizinkan", { status: 403 }); }
}
