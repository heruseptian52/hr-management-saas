import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { RollbackForm } from "./RollbackForm";

export default async function ImportHistoryPage({ searchParams }: { searchParams: Promise<{ rolledBack?: string; error?: string }> }) {
  let tenant; try { tenant = await requirePermission("employees", "view"); } catch { redirect("/dashboard"); }
  const [batches, query] = await Promise.all([db.importBatch.findMany({ where: { companyId: tenant.companyId, dataType: "EMPLOYEE" }, orderBy: { createdAt: "desc" }, take: 100 }), searchParams]);
  const canRollback = hasPermission(tenant.membership.role.permissions, "employees", "delete");
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Riwayat Import Karyawan</h1><p>Setiap batch hanya menampilkan data milik {tenant.membership.company.name}.</p></div><a href="/employees">Kembali</a></header>
    {query.rolledBack && <div className="form-success">Batch berhasil dibatalkan. Hanya data baru dari batch tersebut yang dinonaktifkan.</div>}{query.error && <div className="form-error">Rollback gagal atau batch tidak ditemukan.</div>}
    <div className="data-table"><div className="data-row import-history heading"><b>Waktu & File</b><b>Batch ID</b><b>Hasil</b><b>Status</b><b>Aksi</b></div>{batches.map(batch => <div className="data-row import-history" key={batch.id}><span>{batch.createdAt.toLocaleString("id-ID")}<small>{batch.filename}</small></span><code>{batch.id}</code><span>{batch.createdRows} baru · {batch.updatedRows} update · {batch.warningRows} warning · {batch.errorRows} gagal</span><b>{batch.rolledBackAt ? "Dibatalkan" : "Selesai"}{batch.errorRows > 0 && <a href={`/api/employees/import/errors?batchId=${batch.id}`}>Download Error</a>}</b><span>{canRollback && !batch.rolledBackAt && batch.createdRows > 0 ? <RollbackForm batchId={batch.id} filename={batch.filename}/> : "-"}</span></div>)}</div>
  </section></main>;
}
