import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string; saved?: string; error?: string }> }) {
  let tenant;
  try { tenant = await requirePermission("attendance", "view"); } catch { redirect("/dashboard"); }
  const query = await searchParams;
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : new Date().toISOString().slice(0, 10);
  const start = new Date(`${dateValue}T00:00:00.000Z`);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  const [employees, records] = await Promise.all([
    db.employee.findMany({ where: { companyId: tenant.companyId, deletedAt: null, employmentStatus: "ACTIVE" }, orderBy: { fullName: "asc" } }),
    db.attendance.findMany({ where: { companyId: tenant.companyId, workDate: { gte: start, lt: end } }, include: { employee: true, branch: true }, orderBy: { employee: { fullName: "asc" } } }),
  ]);
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Absensi</h1><p>Data absensi {tenant.membership.company.name}, terisolasi dari perusahaan lain.</p></div><a href="/dashboard">Kembali</a></header>
    {query.saved && <div className="form-success">Absensi berhasil disimpan.</div>}{query.error && <div className="form-error">Absensi gagal disimpan. Periksa data dan hak akses.</div>}
    <form className="search-form" method="get"><input type="date" name="date" defaultValue={dateValue}/><button>Tampilkan</button></form>
    <div className="data-table"><div className="data-row attendance heading"><b>Karyawan</b><b>Status</b><b>Masuk</b><b>Pulang</b><b>Metode</b><b>Cabang</b></div>{records.map(item => <div className="data-row attendance" key={item.id}><strong>{item.employee.fullName}</strong><span>{item.status}</span><span>{item.checkInAt?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: tenant.membership.company.timezone }) ?? "-"}</span><span>{item.checkOutAt?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: tenant.membership.company.timezone }) ?? "-"}</span><span>{item.method}</span><span>{item.branch?.name ?? "-"}</span></div>)}</div>
    <form action="/api/attendance" method="post" className="settings-form employee-form"><h2 className="wide">Input absensi manual</h2><label>Karyawan<select name="employeeId" required>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.employeeNumber} · {employee.fullName}</option>)}</select></label><label>Tanggal<input type="date" name="workDate" defaultValue={dateValue} required/></label><label>Status<select name="status" defaultValue="PRESENT"><option value="PRESENT">Hadir</option><option value="LATE">Terlambat</option><option value="EARLY_LEAVE">Pulang cepat</option><option value="ABSENT">Tidak hadir</option><option value="LEAVE">Cuti</option><option value="SICK">Sakit</option><option value="PERMISSION">Izin</option><option value="HOLIDAY">Libur</option><option value="OVERTIME">Lembur</option></select></label><label>Check-in<input type="time" name="checkIn"/></label><label>Check-out<input type="time" name="checkOut"/></label><label>Catatan<input name="notes" maxLength={500}/></label><button className="wide" type="submit">Simpan absensi</button></form>
  </section></main>;
}
