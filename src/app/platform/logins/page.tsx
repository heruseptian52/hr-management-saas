import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { redirect } from "next/navigation";

export default async function LoginHistoryPage() {
  try { await requireSuperAdmin(); } catch { redirect("/login"); }
  const histories = await db.loginHistory.findMany({ include: { user: { select: { fullName: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">SUPER ADMIN</span><h1>Riwayat login</h1><p>100 percobaan login terbaru.</p></div><a href="/platform">Kembali</a></header><div className="data-table"><div className="data-row login heading"><b>Waktu</b><b>User</b><b>Status</b><b>IP</b></div>{histories.map(item => <div className="data-row login" key={item.id}><span>{item.createdAt.toLocaleString("id-ID")}</span><span>{item.user.email}</span><strong className={item.success ? "success-text" : "danger-text"}>{item.success ? "Berhasil" : "Gagal"}</strong><span>{item.ipAddress ?? "-"}</span></div>)}</div></section></main>;
}
