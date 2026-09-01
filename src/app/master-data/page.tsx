import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

const labels: Record<string, string> = { EMPLOYEE_STATUS: "Status Karyawan", MARITAL_STATUS: "Status Pernikahan", RELIGION: "Agama" };
export default async function MasterDataPage() {
  let tenant; try { tenant = await requirePermission("employees", "view"); } catch { redirect("/dashboard"); }
  const data = await db.masterData.findMany({ where: { companyId: tenant.companyId, deletedAt: null }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }), editable = hasPermission(tenant.membership.role.permissions, "employees", "edit");
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">MASTER DATA</span><h1>Data Karyawan</h1><p>Kategori dinamis khusus {tenant.membership.company.name}; tidak terlihat oleh perusahaan lain.</p></div><a href="/dashboard">Kembali</a></header>
    <div className="master-groups">{Object.entries(labels).map(([category,label]) => <article className="org-card" key={category}><h2>{label}</h2><div className="compact-list">{data.filter(item => item.category === category).map(item => <div key={item.id}><span style={{color:item.color ?? undefined}}>●</span><strong>{item.name}</strong>{editable && <form action="/api/master-data" method="post"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="action" value="TOGGLE"/><button>{item.isActive ? "Nonaktifkan" : "Aktifkan"}</button></form>}</div>)}</div>{editable && <form action="/api/master-data" method="post"><input type="hidden" name="action" value="CREATE"/><input type="hidden" name="category" value={category}/><input name="name" placeholder={`Tambah ${label}`} required/><input name="color" type="color" defaultValue="#2563eb"/><button>+ Tambah</button></form>}</article>)}</div>
    <div className="master-links"><h2>Organisasi</h2><a href="/organization">Kelola Jabatan, Divisi, dan Cabang</a><a href="/schedules">Kelola Shift</a></div>
  </section></main>;
}
