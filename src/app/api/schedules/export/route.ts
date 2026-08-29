import { requirePermission } from "@/lib/authorization";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "export");
    const scheduleId = request.nextUrl.searchParams.get("scheduleId");
    if (!scheduleId) throw new Error("MISSING");
    const schedule = await db.schedule.findFirstOrThrow({ where: { id: scheduleId, companyId: tenant.companyId }, include: { assignments: { include: { employee: true, shift: true }, orderBy: [{ employee: { fullName: "asc" } }, { date: "asc" }] } } });
    const rows: unknown[][] = [["PANBOY HR"], [tenant.membership.company.name], [schedule.name], [], ["NIK", "Karyawan", "Tanggal", "Kode Shift", "Nama Shift", "Jam Masuk", "Jam Pulang", "Tipe"]];
    for (const item of schedule.assignments) rows.push([item.employee.employeeNumber, item.employee.fullName, item.date.toISOString().slice(0, 10), item.shift?.code ?? "LIBUR", item.shift?.name ?? "Libur", item.shift?.startTime ?? "-", item.shift?.endTime ?? "-", item.type]);
    const body = `\uFEFF${toCsv(rows)}`;
    return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="panboy-hr-${schedule.month.toISOString().slice(0, 7)}.csv"`, "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Forbidden or schedule not found" }, { status: 403 }); }
}
