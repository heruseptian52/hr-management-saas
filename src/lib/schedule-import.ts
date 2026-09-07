export type ScheduleImportRow = { row: number; date: string; employeeNumber: string; employeeName: string; shift: string; status: string; notes: string };
const key = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const aliases = {
  date: ["tanggal", "date"], employeeNumber: ["id karyawan", "employee id", "nik internal", "kode karyawan"],
  employeeName: ["nama karyawan", "nama", "karyawan", "employee"], shift: ["shift", "kode shift", "nama shift"],
  status: ["status", "tipe"], notes: ["keterangan", "catatan", "notes"],
};
export function mapScheduleRows(headers: string[], rows: Record<string, unknown>[]) {
  const header = (names: string[]) => headers.find(item => names.includes(key(item))) ?? "";
  const mapping = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, header(names)]));
  const mapped = rows.map((source, index) => ({ row: index + 2, date: String(source[mapping.date] ?? "").trim(), employeeNumber: String(source[mapping.employeeNumber] ?? "").trim(), employeeName: String(source[mapping.employeeName] ?? "").trim(), shift: String(source[mapping.shift] ?? "").trim(), status: String(source[mapping.status] ?? "").trim(), notes: String(source[mapping.notes] ?? "").trim() }));
  return { mapping, rows: mapped };
}
export function normalizeScheduleDate(value: string) {
  const clean = value.trim();
  let match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), year: number, month: number, day: number;
  if (match) [, year, month, day] = match.map(Number); else { match = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if (!match) return null; [, day, month, year] = match.map(Number); }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}
export const scheduleImportKey = key;
