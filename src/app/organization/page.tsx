import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function OrganizationPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  let tenant; try { tenant = await requireTenant(); } catch { redirect("/login"); }
  const permissions = tenant.membership.role.permissions;
  if (!["branches", "departments", "positions"].some(module => hasPermission(permissions, module, "view"))) redirect("/dashboard");
  const [branches, departments, positions] = await Promise.all([
    db.branch.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, orderBy: { name: "asc" } }),
    db.position.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  const message = await searchParams;
  const groups = [{ key: "branch", module: "branches", title: "Cabang", items: branches }, { key: "department", module: "departments", title: "Departemen", items: departments }, { key: "position", module: "positions", title: "Jabatan", items: positions }];
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Struktur organisasi</h1><p>Cabang, departemen, dan jabatan milik {tenant.membership.company.name}.</p></div><a href="/dashboard">Kembali</a></header>
    {message.saved && <div className="form-success">Data berhasil ditambahkan.</div>}{message.error && <div className="form-error">Data gagal disimpan. Periksa kode agar tidak sama.</div>}
    <div className="org-grid">{groups.map(group => hasPermission(permissions, group.module, "view") && <article className="org-card" key={group.key}><h2>{group.title}</h2><div className="compact-list">{group.items.map(item => <div key={item.id}><span>{item.code}</span><strong>{item.name}</strong></div>)}{group.items.length === 0 && <p>Belum ada data.</p>}</div>{hasPermission(permissions, group.module, "create") && <form action="/api/organization" method="post"><input type="hidden" name="kind" value={group.key}/><input name="code" placeholder="Kode" required/><input name="name" placeholder={`Nama ${group.title.toLowerCase()}`} required/>{group.key === "branch" && <><input name="address" placeholder="Alamat"/><input name="radiusM" type="number" min="10" max="5000" defaultValue="100"/><select name="timezone" defaultValue={tenant.membership.company.timezone}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></>}<button type="submit">Tambah</button></form>}</article>)}</div>
  </section></main>;
}
