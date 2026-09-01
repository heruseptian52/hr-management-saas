const monthMap: Record<string, number> = {
  januari: 0, january: 0, februari: 1, febuari: 1, february: 1, maret: 2, march: 2,
  april: 3, mei: 4, may: 4, juni: 5, june: 5, juli: 6, july: 6, agustus: 7, august: 7,
  september: 8, oktober: 9, october: 9, november: 10, desember: 11, december: 11,
};

export const importText = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");
export const importKey = (value: unknown) => importText(value).toLocaleLowerCase("id-ID");

const acronyms = new Set(["hrd", "ga", "pic", "it", "ceo", "cfo", "bpjs", "npwp", "ktp", "kk"]);
export function tidyEmployeeText(value: unknown) {
  return importText(value).toLocaleLowerCase("id-ID").split(/(\s+|[&/.-])/).map(part => {
    if (!/[a-z]/i.test(part)) return part;
    if (acronyms.has(part)) return part.toUpperCase();
    return part.charAt(0).toLocaleUpperCase("id-ID") + part.slice(1);
  }).join("");
}

export function parseEmployeeDate(value: unknown): { date: Date | null; warning?: string; original: string } {
  const original = importText(value);
  if (!original) return { date: null, original };
  if (value instanceof Date && !Number.isNaN(value.getTime())) return { date: value, original };
  if (typeof value === "number" && value > 0) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000));
    return { date: utc, original };
  }
  const datePortion = original.includes(",") ? original.split(",").at(-1)!.trim() : original;
  const cleaned = datePortion.toLocaleLowerCase("id-ID").replace(/,/g, " ").replace(/(\d)([a-z])/gi, "$1 $2").replace(/([a-z])(\d)/gi, "$1 $2").replace(/\s+/g, " ").trim();
  const named = cleaned.match(/^(\d{1,2})[\s\-/]+([a-z]+)[\s\-/]+(\d{4})$/i);
  const numeric = cleaned.match(/^(\d{1,2})[\-/](\d{1,2})[\-/](\d{4})$/);
  let day: number, month: number, year: number;
  if (named) { day = Number(named[1]); month = monthMap[named[2]]; year = Number(named[3]); }
  else if (numeric) { day = Number(numeric[1]); month = Number(numeric[2]) - 1; year = Number(numeric[3]); }
  else {
    const fallback = new Date(datePortion);
    if (!Number.isNaN(fallback.getTime())) return { date: new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate())), original };
    return { date: null, original, warning: `Tanggal tidak valid: ${original}` };
  }
  if (!Number.isInteger(month)) return { date: null, original, warning: `Tanggal tidak valid: ${original}` };
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return { date: null, original, warning: `Tanggal tidak valid: ${original}` };
  return { date, original };
}

export function normalizeNationalId(value: unknown) { return importText(value).replace(/\D/g, ""); }
export function normalizePhones(value: unknown) {
  return importText(value).split(/\s*\/\s*/).map(item => item.replace(/\s+/g, "").replace(/-{2,}/g, "-")).filter(Boolean).join(" / ");
}
export function phoneDigits(value: unknown) { return normalizePhones(value).split("/")[0]?.replace(/\D/g, "") ?? ""; }
export function safeCode(value: unknown, prefix: string) {
  const code = importText(value).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return code || `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
