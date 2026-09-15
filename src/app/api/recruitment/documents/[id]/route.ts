import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await requirePermission("recruitment", "view"), { id } = await params;
    const item = await db.candidateDocument.findFirst({ where: { id, companyId: tenant.companyId, deletedAt: null }, select: { fileData: true, mimeType: true, fileName: true, fileSize: true } });
    if (!item) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    return new NextResponse(item.fileData, { headers: { "Content-Type": item.mimeType, "Content-Length": String(item.fileSize), "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(item.fileName)}`, "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Akses ditolak." }, { status: 403 }); }
}
