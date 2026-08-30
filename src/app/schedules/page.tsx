import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

function validMonth(value?: string) { return /^\d{4}-\d{2}$/.test(value ?? "") ? value! : new Date().toISOString().slice(0, 7); }

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<{ month?: string; branchId?: string; departmentId?: string; saved?: string; error?: string }> }) {
  let tenant; try { tenant = await requireTenant(); } catch { redirect("/login"); }
  const permissions = tenant.membership.role.permissions;
  if (!hasPermission(permissions, "schedules", "view") && !hasPermission(permissions, "shifts", "view")) redirect("/dashboard");
  const query = await searchParams, monthValue = validMonth(query.month), [year, month] = monthValue.split("-").map(Number), monthDate = new Date(Date.UTC(year, month - 1, 1));
  const branchId = query.branchId || null, departmentId = query.departmentId || null;
  const [shifts, branches, departments, schedule] = await Promise.all([
    db.shift.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, orderBy: { startTime: "asc" } }), db.branch.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.department.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }),
    db.schedule.findFirst({ where: { companyId: tenant.companyId, month: monthDate, branchId, departmentId }, include: { assignments: { include: { employee: true, shift: true }, orderBy: [{ employee: { fullName: "asc" } }, { date: "asc" }] } } }),
  ]);
  const employeeRows = new Map<string, typeof schedule extends null ? never : NonNullable<typeof schedule>["assignments"]>();
  schedule?.assignments.forEach(item => employeeRows.set(item.employeeId, [...(employeeRows.get(item.employeeId) ?? []), item]));
  const scopeQuery = `month=${monthValue}&branchId=${branchId ?? ""}&departmentId=${departmentId ?? ""}`;
  const warnings: string[] = [];
  for (const assignments of employeeRows.values()) {
    const expectedOff = assignments[0].employee.monthlyDaysOff;
    const actualOff = assignments.filter(item => item.type === "OFF").length;
    if (actualOff !== expectedOff) warnings.push(`${assignments[0].employee.fullName}: libur ${actualOff} hari, target ${expectedOff} hari.`);
  }
  if (schedule) {
    const coverage = new Map<string, number>();
    for (const item of schedule.assignments) if (item.type === "WORK" && item.shiftId) {
      const key = `${item.date.toISOString().slice(0, 10)}:${item.shiftId}`;
      coverage.set(key, (coverage.get(key) ?? 0) + 1);
    }
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day++) for (const shift of shifts) {
      const date = `${monthValue}-${String(day).padStart(2, "0")}`;
      const total = coverage.get(`${date}:${shift.id}`) ?? 0;
      if (total < shift.minStaff) warnings.push(`${date} ${shift.code}: kekurangan ${shift.minStaff - total} staf (tersedia ${total}, minimum ${shift.minStaff}).`);
      if (shift.maxStaff !== null && total > shift.maxStaff) warnings.push(`${date} ${shift.code}: kelebihan ${total - shift.maxStaff} staf (maksimum ${shift.maxStaff}).`);
    }
  }
  return <main className="settings-page"><section className="settings-card schedule-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Jadwal & shift</h1><p>Jadwal bulanan otomatis yang tetap dapat diedit manual.</p></div><a href="/dashboard">Kembali</a></header>
    {query.saved && <div className="form-success">Perubahan berhasil disimpan.</div>}{query.error && <div className="form-error">Operasi gagal. Pastikan karyawan dan shift sudah tersedia.</div>}
    <div className="schedule-tools"><form method="get"><label>Bulan<input name="month" type="month" defaultValue={monthValue}/></label><label>Cabang<select name="branchId" defaultValue={branchId ?? ""}><option value="">Semua cabang</option>{branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Departemen<select name="departmentId" defaultValue={departmentId ?? ""}><option value="">Semua departemen</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button>Tampilkan</button></form>{hasPermission(permissions, "schedules", "create") && <div className="schedule-create-actions"><form action="/api/schedules/generate" method="post"><input name="month" type="hidden" value={monthValue}/><input name="branchId" type="hidden" value={branchId ?? ""}/><input name="departmentId" type="hidden" value={departmentId ?? ""}/><button>Generate draft</button></form><form action="/api/schedules/copy" method="post"><input name="month" type="hidden" value={monthValue}/><input name="branchId" type="hidden" value={branchId ?? ""}/><input name="departmentId" type="hidden" value={departmentId ?? ""}/><button className="secondary-button">Salin bulan lalu</button></form></div>}</div>
    <div className="shift-strip">{shifts.map(shift => <span key={shift.id} style={{borderColor:shift.color}}><b>{shift.code}</b>{shift.startTime}–{shift.endTime}<small>{shift.minStaff}–{shift.maxStaff ?? "∞"} staf</small></span>)}</div>
    {schedule && <div className="schedule-status"><span>Status: <b>{schedule.status}</b></span><span>{employeeRows.size} karyawan</span>{hasPermission(permissions, "schedules", "export") && <a href={`/api/schedules/export?scheduleId=${schedule.id}`}>Export CSV</a>}{hasPermission(permissions, "schedules", "approve") && <form action="/api/schedules/status" method="post"><input type="hidden" name="scheduleId" value={schedule.id}/><input type="hidden" name="returnMonth" value={monthValue}/><input type="hidden" name="status" value={schedule.status === "DRAFT" ? "PUBLISHED" : schedule.status === "PUBLISHED" ? "LOCKED" : "DRAFT"}/><button>{schedule.status === "DRAFT" ? "Publish jadwal" : schedule.status === "PUBLISHED" ? "Kunci jadwal" : "Buka ulang sebagai draft"}</button></form>}</div>}
    {schedule?.status === "DRAFT" && hasPermission(permissions, "schedules", "edit") && <form action="/api/schedules/bulk" method="post" className="bulk-schedule-form"><input type="hidden" name="scheduleId" value={schedule.id}/><input type="hidden" name="returnMonth" value={monthValue}/><label>Karyawan<select name="employeeId"><option value="ALL">Semua karyawan</option>{[...employeeRows.values()].map(items => <option key={items[0].employeeId} value={items[0].employeeId}>{items[0].employee.fullName}</option>)}</select></label><label>Dari tanggal<input name="startDay" type="number" min="1" max={new Date(Date.UTC(year, month, 0)).getUTCDate()} defaultValue="1"/></label><label>Sampai tanggal<input name="endDay" type="number" min="1" max={new Date(Date.UTC(year, month, 0)).getUTCDate()} defaultValue="1"/></label><label>Shift<select name="shiftId"><option value="OFF">Libur</option>{shifts.map(item => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label><button>Terapkan massal</button></form>}
    {warnings.length > 0 && <div className="schedule-warnings"><b>Peringatan konflik</b>{warnings.slice(0, 8).map(item => <span key={item}>{item}</span>)}</div>}
    {schedule ? <div className="schedule-table"><div className="schedule-row schedule-heading"><b>Karyawan</b>{Array.from({ length: new Date(Date.UTC(year, month, 0)).getUTCDate() }, (_, index) => <b key={index}>{index + 1}</b>)}</div>{[...employeeRows.values()].map(assignments => <div className="schedule-row" key={assignments[0].employeeId}><strong>{assignments[0].employee.fullName}</strong>{assignments.map(item => schedule.status === "DRAFT" ? <form action="/api/schedules/assignment" method="post" key={item.id}><input type="hidden" name="assignmentId" value={item.id}/><input type="hidden" name="returnMonth" value={monthValue}/><input type="hidden" name="returnQuery" value={scopeQuery}/><select aria-label={`${item.employee.fullName} tanggal ${item.date.getUTCDate()}`} name="shiftId" defaultValue={item.type === "OFF" ? "OFF" : item.shiftId ?? "OFF"}><option value="OFF">L</option>{shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.code}</option>)}</select><button aria-label="Simpan perubahan">✓</button></form> : <span className="locked-cell" key={item.id}>{item.type === "OFF" ? "L" : item.shift?.code}</span>)}</div>)}</div> : <div className="empty-state"><h2>Belum ada jadwal {monthValue}</h2><p>Gunakan tombol Generate atau Salin bulan lalu untuk membuat draft.</p></div>}
    {hasPermission(permissions, "shifts", "create") && <form action="/api/shifts" method="post" className="settings-form shift-form"><h2 className="wide">Tambah custom shift</h2><label>Kode<input name="code" required/></label><label>Nama shift<input name="name" required/></label><label>Jam masuk<input name="startTime" type="time" required/></label><label>Jam pulang<input name="endTime" type="time" required/></label><label>Istirahat (menit)<input name="breakMinutes" type="number" min="0" max="480" defaultValue="60"/></label><label>Toleransi terlambat<input name="lateToleranceMin" type="number" min="0" max="180" defaultValue="0"/></label><label>Minimum staf<input name="minStaff" type="number" min="0" defaultValue="1"/></label><label>Maksimum staf<input name="maxStaff" type="number" min="1" placeholder="Tidak dibatasi"/></label><label>Warna<input name="color" type="color" defaultValue="#2563EB"/></label><button className="wide">Tambah shift</button></form>}
  </section></main>;
}
