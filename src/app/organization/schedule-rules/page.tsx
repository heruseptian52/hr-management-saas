import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

const DAYS = [
  { value: 1, label: "Senin" }, { value: 2, label: "Selasa" }, { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" }, { value: 5, label: "Jumat" }, { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

function numberList(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : [];
}
function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function DepartmentScheduleRulesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  let tenant; try { tenant = await requireTenant(); } catch { redirect("/login"); }
  const permissions = tenant.membership.role.permissions;
  if (!hasPermission(permissions, "departments", "view")) redirect("/dashboard");
  const editable = hasPermission(permissions, "departments", "edit");
  const [departments, shifts] = await Promise.all([
    db.department.findMany({
      where: { companyId: tenant.companyId, deletedAt: null },
      include: { scheduleRule: true },
      orderBy: { name: "asc" },
    }),
    db.shift.findMany({
      where: { companyId: tenant.companyId, deletedAt: null },
      orderBy: [{ startTime: "asc" }, { name: "asc" }],
    }),
  ]);
  const message = await searchParams;
  return <main className="settings-page"><section className="settings-card">
    <header><div><span className="eyebrow">PANBOY HR · PENJADWALAN</span><h1>Kelompok & aturan shift departemen</h1><p>Batasi shift dan hari libur untuk setiap departemen di {tenant.membership.company.name}.</p></div><div className="header-actions"><a href="/organization/position-schedule-rules">Aturan jabatan</a><a href="/organization">Kembali</a></div></header>
    {message.saved && <div className="form-success">Aturan departemen berhasil disimpan dan langsung dipakai generator jadwal.</div>}
    {message.error && <div className="form-error">Aturan gagal disimpan. Pastikan shift masih aktif dan berasal dari perusahaan ini.</div>}
    <div className="rule-help"><b>Cara kerja</b><span>Shift yang dicentang adalah shift yang boleh diterima anggota departemen.</span><span>Hari “tidak boleh libur” tidak akan dipilih generator dan ditolak pada edit manual.</span></div>
    <div className="department-rule-list">
      {departments.map(department => {
        const allowed = new Set(stringList(department.scheduleRule?.allowedShiftIds));
        const blocked = new Set(numberList(department.scheduleRule?.forbiddenOffWeekdays));
        return <form key={department.id} action="/api/organization/schedule-rules" method="post" className="department-rule-card">
          <input type="hidden" name="departmentId" value={department.id}/>
          <div className="department-rule-title"><div><span>{department.code}</span><h2>{department.name}</h2></div><label>Pola<select name="rotation" defaultValue={department.scheduleRule?.rotation ?? "DAILY"} disabled={!editable}><option value="DAILY">Rotasi harian</option><option value="WEEKLY">Rotasi mingguan</option><option value="FIXED">Shift tetap</option></select></label></div>
          <fieldset disabled={!editable}><legend>Shift yang diperbolehkan</legend><p>Jika tidak ada yang dicentang, semua shift umum dan shift departemen ini diperbolehkan.</p><div className="rule-check-grid">{shifts.map(shift => <label key={shift.id} className="rule-check"><input type="checkbox" name="allowedShiftIds" value={shift.id} defaultChecked={allowed.has(shift.id)}/><span style={{ borderLeftColor: shift.color }}><b>{shift.name}</b><small>{shift.startTime}–{shift.endTime}</small></span></label>)}</div></fieldset>
          <fieldset disabled={!editable}><legend>Hari yang tidak boleh libur</legend><div className="rule-check-grid days">{DAYS.map(day => <label key={day.value} className="rule-check"><input type="checkbox" name="forbiddenOffWeekdays" value={day.value} defaultChecked={blocked.has(day.value)}/><span><b>{day.label}</b></span></label>)}</div></fieldset>
          {editable && <button type="submit">Simpan aturan {department.name}</button>}
        </form>;
      })}
      {!departments.length && <div className="empty-state"><h2>Belum ada departemen</h2><p>Tambahkan departemen terlebih dahulu dari Struktur Organisasi.</p></div>}
    </div>
  </section></main>;
}
