import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { parseWorkbook } from "@/lib/excel";
import { mapScheduleRows, normalizeScheduleDate, scheduleImportKey } from "@/lib/schedule-import";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "create"), form = await request.formData();
    const file = form.get("file"), month = String(form.get("month") ?? "");
    if (!/^\d{4}-\d{2}$/.test(month) || !file || typeof file === "string" || !/\.(xlsx|xls)$/i.test(file.name) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File XLSX/XLS maksimal 10 MB dan bulan wajib valid" }, { status: 400 });
    const parsed = parseWorkbook(Buffer.from(await file.arrayBuffer())), mapped = mapScheduleRows(parsed.headers, parsed.rows);
    const [employees, shifts] = await Promise.all([
      db.employee.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, select: { id: true, employeeNumber: true, fullName: true } }),
      db.shift.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, select: { id: true, code: true, name: true } }),
    ]);
    const employeeNumbers = new Map(employees.map(item => [scheduleImportKey(item.employeeNumber), item])), employeeNames = new Map(employees.map(item => [scheduleImportKey(item.fullName), item]));
    const shiftMap = new Map(shifts.flatMap(item => [[scheduleImportKey(item.code), item] as const, [scheduleImportKey(item.name), item] as const]));
    const rows = mapped.rows.map(row => { const errors: string[] = [], date = normalizeScheduleDate(row.date), employee = employeeNumbers.get(scheduleImportKey(row.employeeNumber)) ?? employeeNames.get(scheduleImportKey(row.employeeName)), off = ["libur", "off"].includes(scheduleImportKey(row.shift)) || ["libur", "off"].includes(scheduleImportKey(row.status)), shift = off ? null : shiftMap.get(scheduleImportKey(row.shift)); if (!date) errors.push("Tanggal tidak valid"); else if (date.toISOString().slice(0, 7) !== month) errors.push(`Tanggal bukan bulan ${month}`); if (!employee) errors.push("Karyawan tidak ditemukan"); if (!off && !shift) errors.push("Shift tidak ditemukan"); return { ...row, normalizedDate: date?.toISOString().slice(0, 10) ?? "", employeeId: employee?.id ?? "", employeeLabel: employee?.fullName ?? row.employeeName, shiftId: shift?.id ?? "", shiftLabel: off ? "LIBUR" : shift?.code ?? row.shift, type: off ? "OFF" : "WORK", errors, status: errors.length ? "ERROR" : "VALID" }; });
    return NextResponse.json({ filename: file.name, mapping: mapped.mapping, rows, summary: { total: rows.length, valid: rows.filter(item => item.status === "VALID").length, error: rows.filter(item => item.status === "ERROR").length } });
  } catch (error) { console.error("SCHEDULE_IMPORT_PREVIEW", error); return NextResponse.json({ error: "File jadwal tidak dapat dibaca" }, { status: 400 }); }
}
