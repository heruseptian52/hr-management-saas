import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { normalizeScheduleDate } from "@/lib/schedule-import";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const rowSchema = z.object({ date: z.string(), employeeId: z.string().cuid(), shiftId: z.string(), type: z.enum(["WORK", "OFF"]), notes: z.string().max(500) });
const schema = z.object({ filename: z.string().max(200), month: z.string().regex(/^\d{4}-\d{2}$/), branchId: z.string(), departmentId: z.string(), rows: z.array(rowSchema).max(5000) });
export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "create"), parsed = schema.parse(await request.json()), branchId = parsed.branchId || null, departmentId = parsed.departmentId || null;
    const validRows = parsed.rows.filter(row => normalizeScheduleDate(row.date)?.toISOString().slice(0, 7) === parsed.month); if (!validRows.length) throw new Error("NO_VALID_ROWS");
    if (branchId && !(await db.branch.count({ where: { id: branchId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("INVALID_BRANCH");
    if (departmentId && !(await db.department.count({ where: { id: departmentId, companyId: tenant.companyId, deletedAt: null } }))) throw new Error("INVALID_DEPARTMENT");
    const employeeIds = [...new Set(validRows.map(row => row.employeeId))], shiftIds = [...new Set(validRows.filter(row => row.type === "WORK").map(row => row.shiftId))];
    const [employeeCount, shiftCount] = await Promise.all([db.employee.count({ where: { id: { in: employeeIds }, companyId: tenant.companyId, deletedAt: null, ...(branchId ? { branchId } : {}), ...(departmentId ? { departmentId } : {}) } }), db.shift.count({ where: { id: { in: shiftIds }, companyId: tenant.companyId, deletedAt: null } })]);
    if (employeeCount !== employeeIds.length || shiftCount !== shiftIds.length) throw new Error("TENANT_DATA_MISMATCH");
    const [year, month] = parsed.month.split("-").map(Number), monthDate = new Date(Date.UTC(year, month - 1, 1)); let created = 0, updated = 0;
    const schedule = await db.$transaction(async tx => { let current = await tx.schedule.findFirst({ where: { companyId: tenant.companyId, month: monthDate, branchId, departmentId } }); if (current && current.status !== "DRAFT") throw new Error("SCHEDULE_LOCKED"); current ??= await tx.schedule.create({ data: { companyId: tenant.companyId, month: monthDate, branchId, departmentId, name: `Jadwal ${parsed.month}` } }); for (const row of validRows) { const date = normalizeScheduleDate(row.date)!; const existing = await tx.scheduleAssignment.findUnique({ where: { scheduleId_employeeId_date: { scheduleId: current.id, employeeId: row.employeeId, date } } }); const data = { companyId: tenant.companyId, scheduleId: current.id, employeeId: row.employeeId, date, type: row.type, shiftId: row.type === "OFF" ? null : row.shiftId, notes: row.notes || null }; if (existing) { await tx.scheduleAssignment.update({ where: { id: existing.id }, data }); updated++; } else { await tx.scheduleAssignment.create({ data }); created++; } } await tx.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "IMPORT", module: "schedules", entityType: "Schedule", entityId: current.id, newValue: { filename: parsed.filename, month: parsed.month, created, updated } } }); return current; }, { timeout: 120000 });
    return NextResponse.json({ ok: true, scheduleId: schedule.id, created, updated });
  } catch (error) { console.error("SCHEDULE_IMPORT_COMMIT", error); const message = error instanceof Error && error.message === "SCHEDULE_LOCKED" ? "Jadwal sudah dipublikasikan/dikunci" : "Import jadwal gagal divalidasi"; return NextResponse.json({ error: message }, { status: 400 }); }
}
