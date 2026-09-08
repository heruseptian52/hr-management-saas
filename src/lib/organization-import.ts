export type OrganizationKind = "branch" | "department" | "position";

export type OrganizationImportRow = {
  row: number;
  code: string;
  name: string;
  address: string;
  radiusM: number;
  timezone: string;
  isActive: boolean;
  status: "NEW" | "UPDATE" | "ERROR";
  errors: string[];
};

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const organizationImportKey = normalize;

const aliases = {
  code: ["kode", "code", "kode jabatan", "kode departemen", "kode divisi", "kode cabang"],
  name: ["nama", "name", "nama jabatan", "jabatan", "nama departemen", "nama divisi", "departemen", "divisi", "nama cabang", "cabang"],
  address: ["alamat", "address"],
  radiusM: ["radius absensi", "radius", "radius meter"],
  timezone: ["zona waktu", "timezone"],
  active: ["status", "aktif", "active"],
};

function generatedCode(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20);
}

export function parseOrganizationRows(
  kind: OrganizationKind,
  headers: string[],
  rows: Record<string, unknown>[],
  existing: Array<{ code: string; name: string }>,
) {
  const find = (names: string[]) => headers.find(header => names.includes(normalize(header))) ?? "";
  const mapping = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, find(names)]));
  const existingByCode = new Map(existing.map(item => [normalize(item.code), item]));
  const existingByName = new Map(existing.map(item => [normalize(item.name), item]));
  const seen = new Set<string>();
  const result: OrganizationImportRow[] = rows.map((source, index) => {
    const errors: string[] = [];
    const name = String(source[mapping.name] ?? "").trim();
    const matchingName = existingByName.get(normalize(name));
    const code = (String(source[mapping.code] ?? "").trim().toUpperCase() || matchingName?.code || generatedCode(name));
    const address = String(source[mapping.address] ?? "").trim();
    const radiusRaw = String(source[mapping.radiusM] ?? "").trim();
    const radiusM = radiusRaw ? Number(radiusRaw) : 100;
    const timezone = String(source[mapping.timezone] ?? "").trim() || "Asia/Makassar";
    const active = normalize(source[mapping.active]);
    const duplicateInFile = seen.has(normalize(code)) || seen.has(`name:${normalize(name)}`);
    if (!name || name.length > 100) errors.push("Nama wajib diisi, maksimal 100 karakter");
    if (!/^[A-Z0-9_-]{2,20}$/.test(code)) errors.push("Kode otomatis/manual harus 2–20 karakter");
    if (duplicateInFile) errors.push("Data ganda di dalam file");
    if (kind === "branch" && (!Number.isInteger(radiusM) || radiusM < 10 || radiusM > 5000)) errors.push("Radius harus 10–5000 meter");
    if (kind === "branch" && !/^Asia\/[A-Za-z_]+$/.test(timezone)) errors.push("Zona waktu tidak valid");
    const matchingCode = existingByCode.get(normalize(code));
    if (matchingCode && normalize(matchingCode.name) !== normalize(name) && !matchingName) errors.push(`Kode ${code} sudah digunakan oleh ${matchingCode.name}`);
    if (code) seen.add(normalize(code));
    if (name) seen.add(`name:${normalize(name)}`);
    return { row: index + 2, code, name, address, radiusM, timezone, isActive: !["nonaktif", "inactive", "tidak aktif", "0", "false"].includes(active), status: errors.length ? "ERROR" : matchingCode || matchingName ? "UPDATE" : "NEW", errors };
  });
  return { mapping, rows: result };
}
