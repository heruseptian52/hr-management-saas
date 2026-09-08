import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const row = z.object({ code: z.string().regex(/^[A-Z0-9_-]{2,20}$/), name: z.string().min(1).max(100), address: z.string().max(500), radiusM: z.number().int().min(10).max(5000), timezone: z.string().max(50), isActive: z.boolean() });
const schema = z.object({ kind: z.enum(["branch", "department", "position"]), filename: z.string().max(200), rows: z.array(row).min(1).max(5000) });
const modules = { branch: "branches", department: "departments", position: "positions" } as const;

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.parse(await request.json());
    const tenant = await requirePermission(modules[parsed.kind], "create");
    let created = 0, updated = 0;
    const batch = await db.$transaction(async tx => {
      const item = await tx.importBatch.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, filename: parsed.filename, dataType: parsed.kind.toUpperCase(), totalRows: parsed.rows.length } });
      for (const source of parsed.rows) {
        if (parsed.kind === "branch") {
          const existing = await tx.branch.findFirst({ where: { companyId: tenant.companyId, OR: [{ code: source.code }, { name: { equals: source.name, mode: "insensitive" } }] } });
          const data = { code: source.code, name: source.name, address: source.address || null, radiusM: source.radiusM, timezone: source.timezone, deletedAt: source.isActive ? null : new Date() };
          if (existing) { await tx.branch.update({ where: { id: existing.id }, data }); updated++; } else { await tx.branch.create({ data: { companyId: tenant.companyId, ...data } }); created++; }
        } else if (parsed.kind === "department") {
          const existing = await tx.department.findFirst({ where: { companyId: tenant.companyId, OR: [{ code: source.code }, { name: { equals: source.name, mode: "insensitive" } }] } });
          const data = { code: source.code, name: source.name, deletedAt: source.isActive ? null : new Date() };
          if (existing) { await tx.department.update({ where: { id: existing.id }, data }); updated++; } else { await tx.department.create({ data: { companyId: tenant.companyId, ...data } }); created++; }
        } else {
          const existing = await tx.position.findFirst({ where: { companyId: tenant.companyId, OR: [{ code: source.code }, { name: { equals: source.name, mode: "insensitive" } }] } });
          const data = { code: source.code, name: source.name, deletedAt: source.isActive ? null : new Date() };
          if (existing) { await tx.position.update({ where: { id: existing.id }, data }); updated++; } else { await tx.position.create({ data: { companyId: tenant.companyId, ...data } }); created++; }
        }
      }
      await tx.importBatch.update({ where: { id: item.id }, data: { createdRows: created, updatedRows: updated } });
      await tx.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "IMPORT", module: modules[parsed.kind], entityType: "ImportBatch", entityId: item.id, newValue: { kind: parsed.kind, filename: parsed.filename, created, updated } } });
      return item;
    }, { timeout: 120000 });
    return NextResponse.json({ ok: true, batchId: batch.id, created, updated });
  } catch (error) {
    console.error("ORGANIZATION_IMPORT_COMMIT", error);
    return NextResponse.json({ error: "Import gagal divalidasi. Tidak ada data yang disimpan." }, { status: 400 });
  }
}
