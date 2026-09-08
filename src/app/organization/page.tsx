import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { OrganizationItemActions } from "./OrganizationItemActions";
import { OrganizationImportDialog } from "./OrganizationImportDialog";

export default async function OrganizationPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  let tenant; try { tenant = await requireTenant(); } catch { redirect("/login"); }
  const permissions = tenant.membership.role.permissions;
  if (!["branches", "departments", "positions"].some(module => hasPermission(permissions, module, "view"))) redirect("/dashboard");
  const [branches, departments, positions] = await Promise.all([
    db.branch.findMany({ where: { companyId: tenant.companyId }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { companyId: tenant.companyId }, orderBy: { name: "asc" } }),
    db.position.findMany({ where: { companyId: tenant.companyId }, orderBy: { name: "asc" } }),
  ]);
  const message = await searchParams;
  const groups = [{ key: "branch", module: "branches", title: "Cabang", items: branches }, { key: "department", module: "departments", title: "Departemen", items: departments }, { key: "position", module: "positions", title: "Jabatan", items: positions }];
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Struktur organisasi</h1><p>Cabang, departemen, dan jabatan milik {tenant.membership.company.name}.</p></div><div className="header-actions"><a className="secondary-button" href="/organization/schedule-rules">Aturan departemen</a><a className="secondary-button" href="/organization/position-schedule-rules">Aturan jabatan</a><a href="/dashboard">Kembali</a></div></header>
    {message.saved && <div className="form-success">Perubahan data berhasil disimpan.</div>}{message.error && <div className="form-error">{message.error === "used" ? "Data masih digunakan oleh karyawan, shift, atau absensi. Nonaktifkan agar riwayat tetap aman." : message.error === "duplicate" ? "Kode sudah digunakan dalam perusahaan ini." : "Data gagal disimpan. Periksa kembali isian."}</div>}
    <div className="org-grid">{groups.map(group => hasPermission(permissions, group.module, "view") && <article className="org-card" key={group.key}><h2>{group.title}</h2><div className="header-actions">{hasPermission(permissions, group.module, "create") && <OrganizationImportDialog kind={group.key as "branch"|"department"|"position"} title={group.title}/>} {hasPermission(permissions, group.module, "export") && <a className="secondary-button" href={`/api/organization/export?kind=${group.key}`}>Export Excel</a>}{hasPermission(permissions, group.module, "create") && <a className="secondary-button" href={`/api/organization/template?kind=${group.key}`}>Template</a>}</div><div className="compact-list">{group.items.map(item => <div key={item.id}><span>{item.code}</span><strong>{item.name}<small>{item.deletedAt ? "NONAKTIF" : "AKTIF"}</small></strong>{hasPermission(permissions, group.module, "edit") && <details><summary>Edit</summary><form action="/api/organization/manage" method="post"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="kind" value={group.key}/><input type="hidden" name="action" value="UPDATE"/><input name="code" defaultValue={item.code} required/><input name="name" defaultValue={item.name} required/><button>Simpan</button></form></details>}<OrganizationItemActions id={item.id} kind={group.key as "branch"|"department"|"position"} name={item.name} inactive={Boolean(item.deletedAt)} canEdit={hasPermission(permissions,group.module,"edit")} canDelete={hasPermission(permissions,group.module,"delete")}/></div>)}{group.items.length === 0 && <p>Belum ada data.</p>}</div>{hasPermission(permissions, group.module, "create") && <form action="/api/organization" method="post"><input type="hidden" name="kind" value={group.key}/><input name="code" placeholder="Kode" required/><input name="name" placeholder={`Nama ${group.title.toLowerCase()}`} required/>{group.key === "branch" && <><input name="address" placeholder="Alamat"/><input name="radiusM" type="number" min="10" max="5000" defaultValue="100"/><select name="timezone" defaultValue={tenant.membership.company.timezone}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></>}<button type="submit">Tambah</button></form>}</article>)}</div>
  </section></main>;
}
