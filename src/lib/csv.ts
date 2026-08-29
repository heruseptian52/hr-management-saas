export function safeCsvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(rows: unknown[][]) { return rows.map(row => row.map(safeCsvCell).join(",")).join("\r\n"); }

