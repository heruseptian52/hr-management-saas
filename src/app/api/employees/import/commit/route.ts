import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ filename: z.string().max(200), rows: z.array(z.record(z.string(), z.unknown())).max(5000), mapping: z.record(z.string(), z.string()), dryRun: z.boolean(), duplicateStrategy: z.enum(["SKIP", "UPDATE", "NEW"]), createMasters: z.boolean() });
const text = (value: unknown) => String(value ?? "").trim();
const key = (value: unknown) => text(value).toLocaleLowerCase("id-ID");
const phone = (value: unknown) => { const digits = text(value).replace(/\D/g, ""); return digits.startsWith("0") ? `62${digits.slice(1)}` : digits; };
const typeMap: Record<string, "PERMANENT" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | "PART_TIME"> = { tetap: "PERMANENT", permanent: "PERMANENT", kontrak: "CONTRACT", contract: "CONTRACT", magang: "INTERNSHIP", internship: "INTERNSHIP", freelance: "FREELANCE", "paruh waktu": "PART_TIME", "part time": "PART_TIME" };
const statusMap: Record<string, "ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED"> = { aktif: "ACTIVE", active: "ACTIVE", nonaktif: "INACTIVE", inactive: "INACTIVE", resign: "RESIGNED", resigned: "RESIGNED", terminated: "TERMINATED", diberhentikan: "TERMINATED" };

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("employees", "create"), parsed = schema.parse(await request.json());
    const value = (row: Record<string, unknown>, field: string) => parsed.mapping[field] ? row[parsed.mapping[field]] : "";
    const [existingEmployees, positions, departments, branches, shifts] = await Promise.all([
      db.employee.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, select: { id: true, employeeNumber: true, email: true, phone: true } }),
      db.position.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.department.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.branch.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.shift.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }),
    ]);
    const byNik = new Map(existingEmployees.map(item => [key(item.employeeNumber), item])), byEmail = new Map(existingEmployees.filter(item => item.email).map(item => [key(item.email), item])), byPhone = new Map(existingEmployees.filter(item => item.phone).map(item => [phone(item.phone), item]));
    const positionMap = new Map(positions.map(item => [key(item.name), item.id])), departmentMap = new Map(departments.map(item => [key(item.name), item.id])), branchMap = new Map(branches.map(item => [key(item.name), item.id])), shiftNames = new Set(shifts.flatMap(item => [key(item.name), key(item.code)]));
    const results: Array<Record<string, unknown>> = [], validRows: Array<Record<string, unknown>> = [];
    for (let index = 0; index < parsed.rows.length; index++) {
      const row = parsed.rows[index], fullName = text(value(row, "fullName")), nik = text(value(row, "employeeNumber")).toUpperCase(), email = key(value(row, "email")), normalizedPhone = phone(value(row, "phone")), errors: string[] = [], warnings: string[] = [];
      if (!fullName) errors.push("Nama karyawan wajib diisi"); if (email && !z.string().email().safeParse(email).success) errors.push("Format email tidak valid");
      const rawDate = text(value(row, "joinDate")), date = rawDate ? new Date(rawDate) : new Date(); if (rawDate && Number.isNaN(date.getTime())) errors.push("Tanggal masuk tidak valid");
      const positionName = text(value(row, "position")), departmentName = text(value(row, "department")), branchName = text(value(row, "branch")), shiftName = text(value(row, "shift"));
      if (positionName && !positionMap.has(key(positionName))) warnings.push(`Jabatan '${positionName}' belum tersedia`); if (departmentName && !departmentMap.has(key(departmentName))) warnings.push(`Divisi '${departmentName}' belum tersedia`); if (branchName && !branchMap.has(key(branchName))) warnings.push(`Cabang '${branchName}' belum tersedia`); if (shiftName && !shiftNames.has(key(shiftName))) warnings.push(`Shift '${shiftName}' tidak ditemukan`);
      const duplicate = (nik ? byNik.get(key(nik)) : undefined) || (email ? byEmail.get(email) : undefined) || (normalizedPhone ? byPhone.get(normalizedPhone) : undefined);
      const importStatus = errors.length ? "ERROR" : duplicate ? (parsed.duplicateStrategy === "UPDATE" ? "UPDATE" : parsed.duplicateStrategy === "NEW" ? "VALID" : "DUPLICATE") : warnings.length ? "WARNING" : "VALID";
      const normalized = { fullName, employeeNumber: nik, email: email || null, phone: normalizedPhone || null, joinDate: date, positionName, departmentName, branchName, employmentType: typeMap[key(value(row, "employmentType"))] ?? "CONTRACT", employmentStatus: statusMap[key(value(row, "status"))] ?? "ACTIVE", duplicateId: duplicate?.id ?? null };
      results.push({ row: index + 2, status: importStatus, errors, warnings, name: fullName, employeeNumber: nik, original: row }); if (!errors.length && importStatus !== "DUPLICATE") validRows.push(normalized);
    }
    if (parsed.dryRun) return NextResponse.json({ rows: results, summary: { total: results.length, valid: results.filter(r => r.status === "VALID").length, warning: results.filter(r => r.status === "WARNING").length, error: results.filter(r => r.status === "ERROR").length, duplicate: results.filter(r => r.status === "DUPLICATE").length, update: results.filter(r => r.status === "UPDATE").length } });
    let created = 0, updated = 0, skipped = results.length - validRows.length;
    await db.$transaction(async tx => {
      for (let index = 0; index < validRows.length; index++) {
        const item = validRows[index] as { fullName: string; employeeNumber: string; email: string | null; phone: string | null; joinDate: Date; positionName: string; departmentName: string; branchName: string; employmentType: "PERMANENT" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | "PART_TIME"; employmentStatus: "ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED"; duplicateId: string | null };
        async function master(model: "position" | "department" | "branch", name: string, map: Map<string, string>) { if (!name) return null; if (map.has(key(name))) return map.get(key(name))!; if (!parsed.createMasters) return null; const code = `${model.slice(0, 3).toUpperCase()}-${Date.now().toString(36)}-${index}`; const record = await (tx[model] as never as { create(args: { data: { companyId: string; name: string; code: string } }): Promise<{ id: string }> }).create({ data: { companyId: tenant.companyId, name, code } }); map.set(key(name), record.id); return record.id; }
        const positionId = await master("position", item.positionName, positionMap), departmentId = await master("department", item.departmentName, departmentMap), branchId = await master("branch", item.branchName, branchMap);
        if (item.duplicateId && parsed.duplicateStrategy === "UPDATE") { await tx.employee.update({ where: { id: item.duplicateId }, data: { fullName: item.fullName, email: item.email, phone: item.phone, joinDate: item.joinDate, positionId, departmentId, branchId, employmentType: item.employmentType, employmentStatus: item.employmentStatus } }); updated++; }
        else { let employeeNumber = item.employeeNumber || `EMP-${Date.now().toString(36).toUpperCase()}-${String(index + 1).padStart(4, "0")}`; if (parsed.duplicateStrategy === "NEW" && byNik.has(key(employeeNumber))) employeeNumber = `${employeeNumber}-${Date.now().toString(36).slice(-4).toUpperCase()}`; await tx.employee.create({ data: { companyId: tenant.companyId, employeeNumber, fullName: item.fullName, email: item.email, phone: item.phone, joinDate: item.joinDate, positionId, departmentId, branchId, employmentType: item.employmentType, employmentStatus: item.employmentStatus } }); created++; }
      }
      await tx.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "IMPORT", module: "employees", newValue: { filename: parsed.filename, total: results.length, created, updated, skipped } } });
    });
    return NextResponse.json({ ok: true, created, updated, skipped, errors: results.filter(item => item.status === "ERROR") });
  } catch { return NextResponse.json({ error: "Import gagal divalidasi atau tidak diizinkan" }, { status: 400 }); }
}
