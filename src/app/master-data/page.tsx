import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { masterDataGroups } from "@/lib/master-data";
import { redirect } from "next/navigation";
import { MasterDataActions } from "./MasterDataActions";

export default async function MasterDataPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  let tenant; try { tenant = await requireTenant(); } catch { redirect("/login"); }
  const permissions = tenant.membership.role.permissions;
  if (!(hasPermission(permissions, "master_data", "view") || hasPermission(permissions, "employees", "view"))) redirect("/dashboard");
  const data = await db.masterData.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }), query = await searchParams;
  const canCreate = hasPermission(permissions, "master_data", "create") || hasPermission(permissions, "employees", "edit"), canEdit = hasPermission(permissions, "master_data", "edit") || hasPermission(permissions, "employees", "edit"), canDelete = hasPermission(permissions, "master_data", "delete") || hasPermission(permissions, "employees", "delete");
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">MASTER DATA</span><h1>Master Data Dinamis</h1><p>Pilihan bisnis khusus {tenant.membership.company.name}; tidak terlihat oleh perusahaan lain.</p></div><a href="/dashboard">Kembali</a></header>
    {query.saved && <div className="form-success">Master data berhasil disimpan.</div>}{query.error && <div className="form-error">{query.error === "used" ? "Data masih digunakan oleh karyawan dan tidak dapat dihapus. Gunakan Nonaktifkan." : query.error === "duplicate" ? "Nama yang sama sudah tersedia dalam kategori ini." : "Master data gagal disimpan."}</div>}
    {masterDataGroups.map(group => <section className="master-section" key={group.title}><h2>{group.title}</h2><div className="master-groups">{group.items.map(([category,label]) => <article className="org-card" key={category}><h3>{label}</h3><div className="compact-list">{data.filter(item => item.category === category).map(item => <div className="master-item" key={item.id}><span style={{color:item.color ?? undefined}}>●</span><strong>{item.name}<small>{item.isActive ? "AKTIF" : "NONAKTIF"}</small></strong>{canEdit && <details><summary>Edit</summary><form action="/api/master-data" method="post"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="action" value="UPDATE"/><input name="name" defaultValue={item.name} required/><input name="color" type="color" defaultValue={item.color??"#2563eb"}/><input name="sortOrder" type="number" min="0" max="999" defaultValue={item.sortOrder}/><button>Simpan</button></form></details>}<MasterDataActions id={item.id} name={item.name} active={item.isActive} canEdit={canEdit} canDelete={canDelete}/></div>)}{!data.some(item => item.category === category) && <p>Belum ada data.</p>}</div>{canCreate && <form action="/api/master-data" method="post"><input type="hidden" name="action" value="CREATE"/><input type="hidden" name="category" value={category}/><input name="name" placeholder={`Tambah ${label}`} required/><label>Warna<input name="color" type="color" defaultValue="#2563eb"/></label><input name="sortOrder" type="number" min="0" max="999" defaultValue="0" placeholder="Urutan"/><button>+ Tambah</button></form>}</article>)}</div></section>)}
    <div className="master-links"><h2>Data Terjadwal</h2><a href="/organization">Jabatan, Departemen, Cabang</a><a href="/shifts">Master Shift</a><a href="/holidays">Hari Libur</a></div>
  </section></main>;
}
