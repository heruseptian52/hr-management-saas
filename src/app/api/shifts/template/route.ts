import { requirePermission } from "@/lib/authorization";
import { styledSheet, workbookResponse } from "@/lib/excel";
import * as XLSX from "xlsx";

export async function GET(){try{await requirePermission("shifts","create");const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,styledSheet([
  ["Kode Shift","Nama Shift","Jam Masuk","Jam Pulang","Durasi Istirahat","Toleransi Terlambat","Minimum Staf","Maksimum Staf","Warna","Status"],
  ["P","Pagi","08:15","16:00",40,10,1,"","#2563EB","Aktif"],
  ["MID","Middle","11:00","19:00",40,10,1,"","#16A34A","Aktif"],
  ["S","Siang","14:00","21:00",40,10,1,"","#F59E0B","Aktif"],
],[16,24,14,14,20,22,16,18,14,14]),"DATA");XLSX.utils.book_append_sheet(workbook,styledSheet([
  ["Kolom","Wajib","Format/Petunjuk"],["Kode Shift","Ya","Unik per perusahaan; 1–20 karakter, contoh P atau MID"],["Nama Shift","Ya","Nama yang mudah dipahami"],["Jam Masuk","Ya","HH:mm, contoh 08:15"],["Jam Pulang","Ya","HH:mm, contoh 16:00"],["Durasi Istirahat","Tidak","Menit, 0–480"],["Toleransi Terlambat","Tidak","Menit, 0–180"],["Minimum Staf","Tidak","Jumlah minimum per shift"],["Maksimum Staf","Tidak","Kosong berarti tidak dibatasi"],["Warna","Tidak","Format HEX, contoh #2563EB"],["Status","Tidak","Aktif atau Nonaktif"],
],[26,14,72]),"PETUNJUK");return workbookResponse(workbook,"template-shift-panboy-hr.xlsx");}catch{return new Response("Tidak diizinkan",{status:403});}}
