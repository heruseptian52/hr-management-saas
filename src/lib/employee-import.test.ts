import { describe, expect, it } from "vitest";
import { normalizeNationalId, normalizePhones, parseEmployeeDate, tidyEmployeeText } from "./employee-import";
import { parseWorkbook } from "./excel";
import * as XLSX from "xlsx";

describe("employee import normalization", () => {
  it.each(["01 OKTOBER 2025", "17JANUARI 2025", "21 FEBRUARI 2006", "09-01-1984", "13 FEBUARI 1989"])("parses Indonesian date %s", value => expect(parseEmployeeDate(value).date).not.toBeNull());
  it("parses the date part of a combined birthplace and date", () => expect(parseEmployeeDate("SAMARINDA, 21 FEBRUARI 2006").date?.toISOString().slice(0, 10)).toBe("2006-02-21"));
  it("warns without inventing an invalid date", () => { const result = parseEmployeeDate("31 APRIL 2026"); expect(result.date).toBeNull(); expect(result.warning).toContain("Tanggal tidak valid"); });
  it("keeps identifiers and multiple phones safe", () => { expect(normalizeNationalId("1234-5678-9012-345-6")).toBe("1234567890123456"); expect(normalizePhones("0000-0000 / 0000-0001")).toBe("0000-0000 / 0000-0001"); });
  it("tidies names while preserving acronyms", () => expect(tidyEmployeeText("LEADER DRIVER & GA")).toBe("Leader Driver & GA"));
});

describe("13-column employee workbook compatibility", () => {
  it("auto maps the supplied workbook format without storing the private workbook", () => {
    const headers = ["NAMA", "TANGGAL MASUK", "PERIODE KONTRAK", "TANGGAL BERHENTI", "STATUS KEAKTIFAN", "JABATAN / POSISI", "TEMPAT LAHIR", "TEMPAT, TANGGAL LAHIR", "ALAMAT", "STATUS", "AGAMA", "NO KTP", "NO TELFON"];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ["CONTOH KARYAWAN 001", "17 JANUARI 2025", "", "", "AKTIF", "", "KOTA CONTOH"]]), "DATA");
    const parsed = parseWorkbook(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.suggestedMapping).toMatchObject({ fullName: "NAMA", joinDate: "TANGGAL MASUK", contractEndDate: "PERIODE KONTRAK", stopDate: "TANGGAL BERHENTI", employeeStatusLabel: "STATUS KEAKTIFAN", position: "JABATAN / POSISI", placeOfBirth: "TEMPAT LAHIR", birthDate: "TEMPAT, TANGGAL LAHIR", address: "ALAMAT", maritalStatus: "STATUS", religion: "AGAMA", nationalId: "NO KTP", phone: "NO TELFON" });
  });
});
