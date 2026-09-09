import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function SelfServicePage() {
  let tenant; try { tenant = await requireTenant(); } catch { redirect("/login"); }
  const user = await db.user.findUniqueOrThrow({ where: { id: tenant.session.userId } });
  const employee = await db.employee.findFirst({ where: { companyId: tenant.companyId, email: { equals: user.email, mode: "insensitive" }, deletedAt: null }, include: { branch: true, department: true, position: true } });
  const now = new Date(), monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [announcements, notifications] = await Promise.all([
    db.announcement.findMany({ where: { companyId: tenant.companyId, status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }, orderBy: [{ priority: "desc" }, { publishedAt: "desc" }], take: 20 }),
    db.notification.findMany({ where: { companyId: tenant.companyId, userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const personal = employee ? await Promise.all([
    db.scheduleAssignment.findMany({ where: { companyId: tenant.companyId, employeeId: employee.id, date: { gte: monthStart, lt: monthEnd } }, include: { shift: true }, orderBy: { date: "asc" } }),
    db.attendance.findMany({ where: { companyId: tenant.companyId, employeeId: employee.id }, orderBy: { workDate: "desc" }, take: 10 }),
    db.leaveRequest.findMany({ where: { companyId: tenant.companyId, employeeId: employee.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.overtimeRequest.findMany({ where: { companyId: tenant.companyId, employeeId: employee.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.payrollItem.findMany({ where: { companyId: tenant.companyId, employeeId: employee.id, payrollPeriod: { status: { in: ["FINALIZED", "PAID"] } } }, include: { payrollPeriod: true }, orderBy: { payrollPeriod: { year: "desc" } }, take: 12 }),
  ]) : [[], [], [], [], []] as const;
  const [schedule, attendance, leaves, overtime, payslips] = personal;
  return <main className="settings-page"><section className="settings-card ess-card">
    <header><div><span className="eyebrow">EMPLOYEE SELF SERVICE</span><h1>Portal Saya</h1><p>{user.fullName} · {tenant.membership.company.name}</p></div><a href="/dashboard">Kembali</a></header>
    {!employee && <div className="form-error">Akun belum terhubung ke data karyawan. Samakan email akun ({user.email}) dengan email pada Data Karyawan.</div>}
    {employee && <><div className="ess-profile"><div><small>Nama</small><strong>{employee.fullName}</strong></div><div><small>ID Karyawan</small><strong>{employee.employeeNumber}</strong></div><div><small>Jabatan</small><strong>{employee.position?.name ?? "-"}</strong></div><div><small>Departemen</small><strong>{employee.department?.name ?? "-"}</strong></div><div><small>Cabang</small><strong>{employee.branch?.name ?? "-"}</strong></div><div><small>Status</small><strong>{employee.employeeStatusLabel || employee.employmentStatus}</strong></div></div>
      <div className="ess-grid"><section><h2>Jadwal Bulan Ini</h2>{schedule.map(x => <div className="ess-row" key={x.id}><b>{x.date.toISOString().slice(0, 10)}</b><span>{x.type === "OFF" ? "LIBUR" : x.shift?.name ?? "Kerja"}</span></div>)}{schedule.length === 0 && <p>Belum ada jadwal.</p>}</section><section><h2>Absensi Terakhir</h2>{attendance.map(x => <div className="ess-row" key={x.id}><b>{x.workDate.toISOString().slice(0, 10)}</b><span>{x.status}</span></div>)}</section><section><h2>Cuti & Izin</h2>{leaves.map(x => <div className="ess-row" key={x.id}><b>{x.typeName}</b><span>{x.status} · {x.totalDays} hari</span></div>)}</section><section><h2>Lembur</h2>{overtime.map(x => <div className="ess-row" key={x.id}><b>{x.workDate.toISOString().slice(0, 10)}</b><span>{x.status} · {(x.totalMinutes / 60).toFixed(1)} jam</span></div>)}</section><section><h2>Slip Gaji</h2>{payslips.map(x => <a className="ess-row" key={x.id} href={`/payroll/${x.payrollPeriod.id}/${x.employeeId}`}><b>{x.payrollPeriod.name}</b><span>{x.payrollPeriod.status}</span></a>)}{payslips.length === 0 && <p>Belum ada slip final.</p>}</section></div></>}
    <div className="ess-communications"><section><h2>Pengumuman</h2>{announcements.map(x => <article key={x.id} className={`priority-${x.priority.toLowerCase()}`}><b>{x.title}</b><p>{x.content}</p><small>{x.priority}</small></article>)}{announcements.length === 0 && <p>Belum ada pengumuman.</p>}</section><section><header><h2>Notifikasi</h2>{notifications.some(x => !x.readAt) && <form action="/api/notifications" method="post"><button>Tandai Semua Dibaca</button></form>}</header>{notifications.map(x => <a key={x.id} href={x.link || "#"} className={`notification ${x.readAt ? "read" : "unread"}`}><b>{x.title}</b><span>{x.message}</span><small>{x.createdAt.toLocaleString("id-ID")}</small></a>)}</section></div>
  </section></main>;
}
