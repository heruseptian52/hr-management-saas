import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { actions, hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

const modules = [{ key: "company", name: "Perusahaan" }, { key: "roles", name: "Role & akses" }, { key: "employees", name: "Karyawan" }, { key: "branches", name: "Cabang" }, { key: "departments", name: "Departemen" }, { key: "positions", name: "Jabatan" }, { key: "audit", name: "Audit" }];

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  let tenant;
  try { tenant = await requirePermission("roles", "view"); } catch { redirect("/dashboard"); }
  const roles = await db.role.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
  const message = await searchParams;
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Role & akses</h1><p>Hak akses hanya berlaku di {tenant.membership.company.name}.</p></div><a href="/dashboard">Kembali</a></header>
    {message.saved && <div className="form-success">Custom role berhasil dibuat.</div>}{message.error && <div className="form-error">Role gagal dibuat. Nama mungkin sudah digunakan.</div>}
    <div className="role-list">{roles.map(role => <article key={role.id}><div><strong>{role.name}</strong><small>{role.isSystem ? "Role sistem" : "Custom role"}</small></div><b>{Object.keys(role.permissions as object).length} modul</b></article>)}</div>
    {hasPermission(tenant.membership.role.permissions, "roles", "create") && <form className="role-form" action="/api/roles" method="post"><h2>Buat custom role</h2><label>Nama role<input name="name" required placeholder="Contoh: Admin Cabang" /></label><div className="permission-table"><div className="permission-row heading"><b>Modul</b>{actions.map(action => <b key={action}>{action}</b>)}</div>{modules.map(module => <div className="permission-row" key={module.key}><strong>{module.name}</strong>{actions.map(action => <label key={action}><input type="checkbox" name="permissions" value={`${module.key}:${action}`} /><span>{action}</span></label>)}</div>)}</div><button type="submit">Buat role</button></form>}
  </section></main>;
}
