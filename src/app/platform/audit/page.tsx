import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { redirect } from "next/navigation";

export default async function PlatformAudit() {
  try { await requireSuperAdmin(); } catch { redirect("/login"); }
  const logs = await db.auditLog.findMany({ include: { actor: { select: { fullName: true, email: true } }, company: { select: { name: true, code: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">SUPER ADMIN</span><h1>Audit platform</h1><p>100 aktivitas terbaru dari seluruh perusahaan, tetap ditandai berdasarkan tenant.</p></div><a href="/platform">Kembali</a></header><div className="data-table"><div className="data-row heading"><b>Waktu</b><b>Perusahaan</b><b>User</b><b>Modul</b><b>Aksi</b></div>{logs.map(log => <div className="data-row" key={log.id}><span>{log.createdAt.toLocaleString("id-ID")}</span><span>{log.company?.code ?? "PLATFORM"}</span><span>{log.actor?.fullName ?? "System"}</span><span>{log.module}</span><strong>{log.action}</strong></div>)}</div></section></main>;
}

