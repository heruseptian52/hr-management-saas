import * as XLSX from "xlsx";

export const employeeFields = [
  ["fullName", "Nama Karyawan"], ["employeeNumber", "ID Karyawan"], ["nationalId", "NIK / No KTP"],
  ["joinDate", "Tanggal Masuk"], ["contractEndDate", "Berakhir Kontrak"], ["stopDate", "Tanggal Berhenti"],
  ["employeeStatusLabel", "Status Keaktifan"], ["position", "Jabatan / Posisi"], ["department", "Divisi / Departemen"],
  ["placeOfBirth", "Tempat Lahir"], ["birthDate", "Tanggal Lahir"], ["address", "Alamat"],
  ["maritalStatus", "Status Pernikahan"], ["religion", "Agama"], ["phone", "Nomor Telepon"],
  ["email", "Email"], ["employmentType", "Jenis Kontrak"], ["shift", "Shift"], ["branch", "Cabang / Lokasi"],
] as const;
export type EmployeeImportField = typeof employeeFields[number][0];

const aliases: Record<EmployeeImportField, string[]> = {
  fullName: ["nama", "nama karyawan", "nama lengkap", "name"], employeeNumber: ["employee id", "id karyawan", "kode karyawan", "nik internal", "kode karyawan / nik internal"], nationalId: ["no ktp", "nomor ktp", "nik", "nik / no ktp"],
  joinDate: ["tanggal masuk", "tgl masuk", "join date"], contractEndDate: ["periode kontrak", "berakhir kontrak", "tanggal berakhir kontrak", "contract end date"], stopDate: ["tanggal berhenti", "resign date", "tanggal resign"],
  employeeStatusLabel: ["status keaktifan", "status karyawan", "status aktif"],
  position: ["jabatan", "posisi", "jabatan / posisi", "position"], department: ["divisi", "departemen", "divisi / departemen", "dept", "department"], phone: ["hp", "nomor hp", "no telfon", "no telepon", "nomor telepon", "telepon", "phone"],
  placeOfBirth: ["tempat lahir"], birthDate: ["tempat, tanggal lahir", "tanggal lahir", "tgl lahir", "birth date"], address: ["alamat", "address"], maritalStatus: ["status", "status pernikahan"], religion: ["agama", "religion"],
  email: ["email", "e-mail"], employmentType: ["jenis kontrak", "jenis kerja", "kontrak"], shift: ["shift"], branch: ["cabang", "lokasi", "cabang / lokasi", "branch"],
};
const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (!matrix.length) throw new Error("EMPTY_FILE");
  const headers = matrix[0].map(value => String(value).trim()).filter(Boolean);
  const rows = matrix.slice(1).filter(row => row.some(value => String(value).trim())).slice(0, 5000).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
  const suggestedMapping = Object.fromEntries(employeeFields.map(([field]) => [field, headers.find(header => aliases[field].includes(normalized(header))) ?? ""]));
  return { headers, rows, suggestedMapping };
}

export function workbookResponse(workbook: XLSX.WorkBook, filename: string) {
  const body = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new Response(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "X-Content-Type-Options": "nosniff" } });
}

export function styledSheet(rows: unknown[][], widths: number[]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map(wch => ({ wch }));
  if (rows.length) sheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(rows[0].length - 1)}${rows.length}` };
  sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" } as never;
  return sheet;
}
