import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  let tenant;
  try { tenant = await requireTenant(); } catch { redirect("/login"); }
  const { companyId, membership } = tenant;
  const [employees, branches, departments] = await Promise.all([
    db.employee.count({ where: { companyId, deletedAt: null, employmentStatus: "ACTIVE" } }),
    db.branch.count({ where: { companyId, deletedAt: null } }),
    db.department.count({ where: { companyId, deletedAt: null } }),
  ]);
  const cards = [["Karyawan aktif", employees], ["Cabang", branches], ["Departemen", departments], ["Role Anda", membership.role.name]];
  return <main className="dashboard-shell">
    <aside className="sidebar"><div className="sidebar-brand"><span>PH</span><strong>PANBOY HR</strong></div>
      <nav><a className="active" href="/dashboard">Ringkasan</a>{hasPermission(membership.role.permissions, "employees", "view") && <a href="/employees">Karyawan</a>}{hasPermission(membership.role.permissions, "branches", "view") && <a href="/organization">Organisasi</a>}{hasPermission(membership.role.permissions, "schedules", "view") && <a href="/schedules">Jadwal & Shift</a>}{hasPermission(membership.role.permissions, "roles", "view") && <a href="/settings/roles">Role & Akses</a>}{hasPermission(membership.role.permissions, "company", "view") && <a href="/settings/company">Perusahaan</a>}</nav>
      {tenant.session.platformRole === "SUPER_ADMIN" && <form action="/api/platform/company-access" method="post"><input type="hidden" name="action" value="exit"/><button>Kembali ke Super Admin</button></form>}
      <form action="/api/auth/logout" method="post"><button>Keluar</button></form>
    </aside>
    <section className="dashboard-content">
      <header><div><span className="eyebrow">DASHBOARD PERUSAHAAN</span><h1>Selamat datang</h1><p>Ringkasan data {membership.company.name}</p></div><div className="tenant-chip">{membership.company.code}</div></header>
      <div className="stats-grid">{cards.map(([label, value]) => <article className="stat-card" key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div>
    </section>
  </main>;
}
