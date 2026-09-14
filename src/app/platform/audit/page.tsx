import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { redirect } from "next/navigation";

type Query = { module?: string; action?: string; companyId?: string; from?: string; to?: string };

export default async function PlatformAudit({ searchParams }: { searchParams: Promise<Query> }) {
  try { await requireSuperAdmin(); } catch { redirect("/login"); }
  const query = await searchParams;
  const where = { ...(query.module ? { module: query.module } : {}), ...(query.action ? { action: query.action } : {}), ...(query.companyId ? { companyId: query.companyId } : {}), ...((query.from || query.to) ? { createdAt: { ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}), ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}) } } : {}) };
  const [logs, companies, moduleRows, actionRows] = await Promise.all([
    db.auditLog.findMany({ where, include: { actor: { select: { fullName: true, email: true } }, company: { select: { name: true, code: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.company.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    db.auditLog.findMany({ distinct: ["module"], select: { module: true }, orderBy: { module: "asc" } }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  const exportQuery = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">SUPER ADMIN</span><h1>Audit platform</h1><p>{logs.length} aktivitas ditampilkan. Semua aktivitas tetap ditandai berdasarkan perusahaan.</p></div><a href="/platform">Kembali</a></header><form className="platform-filter" method="get"><select name="companyId" defaultValue={query.companyId ?? ""}><option value="">Semua perusahaan</option>{companies.map(item=><option value={item.id} key={item.id}>{item.code} — {item.name}</option>)}</select><select name="module" defaultValue={query.module ?? ""}><option value="">Semua modul</option>{moduleRows.map(item=><option value={item.module} key={item.module}>{item.module}</option>)}</select><select name="action" defaultValue={query.action ?? ""}><option value="">Semua aksi</option>{actionRows.map(item=><option value={item.action} key={item.action}>{item.action}</option>)}</select><input type="date" name="from" defaultValue={query.from ?? ""}/><input type="date" name="to" defaultValue={query.to ?? ""}/><button type="submit">Tampilkan</button><a href="/platform/audit">Reset</a><a href={`/api/platform/audit/export${exportQuery ? `?${exportQuery}` : ""}`}>Export Excel</a></form><div className="data-table"><div className="data-row heading"><b>Waktu</b><b>Perusahaan</b><b>User</b><b>Modul</b><b>Aksi</b></div>{logs.map(log => <div className="data-row" key={log.id}><span>{log.createdAt.toLocaleString("id-ID")}</span><span>{log.company?.code ?? "PLATFORM"}</span><span>{log.actor?.fullName ?? "System"}<small>{log.actor?.email ?? ""}</small></span><span>{log.module}</span><strong>{log.action}</strong></div>)}</div></section></main>;
}
