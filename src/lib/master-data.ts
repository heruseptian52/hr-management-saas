export const masterDataGroups = [
  { title: "Kepegawaian", items: [["EMPLOYEE_STATUS", "Status Karyawan"], ["CONTRACT_TYPE", "Jenis Kontrak"], ["LEAVE_TYPE", "Jenis Cuti & Izin"], ["OVERTIME_TYPE", "Jenis Lembur"], ["LEVEL_GRADE", "Level / Grade"]] },
  { title: "Data Pribadi", items: [["MARITAL_STATUS", "Status Pernikahan"], ["RELIGION", "Agama"], ["EDUCATION", "Pendidikan"], ["FAMILY_RELATION", "Hubungan Keluarga"]] },
  { title: "Administrasi", items: [["DOCUMENT_CATEGORY", "Kategori Dokumen"], ["BANK", "Bank"]] },
] as const;
export const masterDataCategories = masterDataGroups.flatMap(group => group.items.map(item => item[0]));
export type MasterDataCategory = typeof masterDataCategories[number];
