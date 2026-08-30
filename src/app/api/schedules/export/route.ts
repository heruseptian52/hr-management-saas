import { requirePermission } from "@/lib/authorization";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const xml = (value: unknown) => String(value ?? "").replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char]!));

async function loadSchedule(companyId: string, scheduleId: string) {
  return db.schedule.findFirstOrThrow({ where: { id: scheduleId, companyId }, include: { assignments: { include: { employee: true, shift: true }, orderBy: [{ employee: { fullName: "asc" } }, { date: "asc" }] } } });
}

function scheduleRows(schedule: Awaited<ReturnType<typeof loadSchedule>>) {
  const employees = new Map<string, typeof schedule.assignments>();
  for (const item of schedule.assignments) employees.set(item.employeeId, [...(employees.get(item.employeeId) ?? []), item]);
  return [...employees.values()];
}

function spreadsheetXml(companyName: string, schedule: Awaited<ReturnType<typeof loadSchedule>>) {
  const rows: string[][] = [["PANBOY HR"], [companyName], [schedule.name], [], ["NIK", "Karyawan", "Tanggal", "Kode Shift", "Nama Shift", "Jam Masuk", "Jam Pulang", "Tipe"]];
  for (const item of schedule.assignments) rows.push([item.employee.employeeNumber, item.employee.fullName, item.date.toISOString().slice(0, 10), item.shift?.code ?? "LIBUR", item.shift?.name ?? "Libur", item.shift?.startTime ?? "-", item.shift?.endTime ?? "-", item.type]);
  const body = rows.map(row => `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${xml(cell)}</Data></Cell>`).join("")}</Row>`).join("");
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Jadwal"><Table>${body}</Table></Worksheet></Workbook>`;
}

function scheduleSvg(companyName: string, schedule: Awaited<ReturnType<typeof loadSchedule>>) {
  const rows = scheduleRows(schedule), days = new Date(Date.UTC(schedule.month.getUTCFullYear(), schedule.month.getUTCMonth() + 1, 0)).getUTCDate();
  const nameWidth = 290, cell = 58, headerHeight = 180, rowHeight = 54, width = nameWidth + days * cell + 40, height = headerHeight + rows.length * rowHeight + 80;
  const colors = new Map(schedule.assignments.filter(item => item.shift).map(item => [item.shiftId, item.shift!.color]));
  let cells = "";
  rows.forEach((items, row) => {
    const y = headerHeight + row * rowHeight;
    cells += `<rect x="20" y="${y}" width="${nameWidth}" height="${rowHeight}" fill="${row % 2 ? "#f8fafc" : "#ffffff"}" stroke="#cbd5e1"/><text x="32" y="${y + 33}" font-size="17" font-weight="700" fill="#0f172a">${xml(items[0].employee.fullName)}</text>`;
    items.forEach(item => {
      const day = item.date.getUTCDate(), x = 20 + nameWidth + (day - 1) * cell, off = item.type === "OFF";
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${rowHeight}" fill="${off ? "#f1f5f9" : (colors.get(item.shiftId) ?? "#2563eb")}" stroke="#cbd5e1"/><text x="${x + cell / 2}" y="${y + 33}" text-anchor="middle" font-size="14" font-weight="800" fill="${off ? "#475569" : "#ffffff"}">${off ? "L" : xml(item.shift?.code ?? "-")}</text>`;
    });
  });
  const headers = Array.from({ length: days }, (_, index) => `<rect x="${20 + nameWidth + index * cell}" y="126" width="${cell}" height="54" fill="#e2e8f0" stroke="#cbd5e1"/><text x="${20 + nameWidth + index * cell + cell / 2}" y="159" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a">${index + 1}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f8fafc"/><text x="20" y="42" font-size="30" font-weight="900" fill="#1d4ed8">${xml(companyName)}</text><text x="20" y="78" font-size="24" font-weight="800" fill="#0f172a">${xml(schedule.name)}</text><text x="20" y="106" font-size="15" fill="#64748b">Dibuat melalui PANBOY HR • ${schedule.status}</text><rect x="20" y="126" width="${nameWidth}" height="54" fill="#0f172a"/><text x="32" y="159" font-size="16" font-weight="800" fill="#ffffff">KARYAWAN</text>${headers}${cells}</svg>`;
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await requirePermission("schedules", "export");
    const scheduleId = request.nextUrl.searchParams.get("scheduleId"), format = request.nextUrl.searchParams.get("format") ?? "csv";
    if (!scheduleId) throw new Error("MISSING");
    const schedule = await loadSchedule(tenant.companyId, scheduleId), month = schedule.month.toISOString().slice(0, 7), companyName = tenant.membership.company.name;
    if (format === "svg") return new NextResponse(scheduleSvg(companyName, schedule), { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `inline; filename="jadwal-${month}.svg"`, "X-Content-Type-Options": "nosniff" } });
    if (format === "excel") return new NextResponse(spreadsheetXml(companyName, schedule), { headers: { "Content-Type": "application/vnd.ms-excel; charset=utf-8", "Content-Disposition": `attachment; filename="jadwal-${month}.xls"`, "X-Content-Type-Options": "nosniff" } });
    const rows: unknown[][] = [["PANBOY HR"], [companyName], [schedule.name], [], ["NIK", "Karyawan", "Tanggal", "Kode Shift", "Nama Shift", "Jam Masuk", "Jam Pulang", "Tipe"]];
    for (const item of schedule.assignments) rows.push([item.employee.employeeNumber, item.employee.fullName, item.date.toISOString().slice(0, 10), item.shift?.code ?? "LIBUR", item.shift?.name ?? "Libur", item.shift?.startTime ?? "-", item.shift?.endTime ?? "-", item.type]);
    return new NextResponse(`\uFEFF${toCsv(rows)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="jadwal-${month}.csv"`, "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Forbidden or schedule not found" }, { status: 403 }); }
}
