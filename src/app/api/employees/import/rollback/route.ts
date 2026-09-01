import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "delete"), parsed = z.object({ batchId: z.string().cuid() }).parse(Object.fromEntries(await request.formData()));
    const batch = await db.importBatch.findFirstOrThrow({ where: { id: parsed.batchId, companyId: tenant.companyId, rolledBackAt: null } }), now = new Date();
    const removed = await db.$transaction(async tx => { const result = await tx.employee.updateMany({ where: { companyId: tenant.companyId, importBatchId: batch.id, deletedAt: null }, data: { deletedAt: now } }); await tx.importBatch.update({ where: { id: batch.id }, data: { rolledBackAt: now } }); await tx.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "IMPORT_ROLLBACK", module: "employees", entityType: "ImportBatch", entityId: batch.id, previousValue: { filename: batch.filename, createdRows: batch.createdRows }, newValue: { softDeletedEmployees: result.count, rolledBackAt: now } } }); return result.count; });
    return NextResponse.redirect(new URL(`/employees/imports?rolledBack=${removed}`, appUrl(request)), 303);
  } catch { return NextResponse.redirect(new URL("/employees/imports?error=rollback", appUrl(request)), 303); }
}
