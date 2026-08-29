import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { redirect } from "next/navigation";

export default async function PlatformDashboard({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; status?: string }> }) {
  try { await requireSuperAdmin(); } catch { redirect("/login"); }
  const companies = await db.company.findMany({ where: { deletedAt: null }, include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } });
  const message = await searchParams;
  return <main className="platform-page"><section className="platform-card"><header><div><span className="eyebrow">SUPER ADMIN PLATFORM</span><h1>Semua perusahaan</h1><p>Statistik dipisahkan per tenant dan tidak menggabungkan data operasional.</p></div><form action="/api/auth/logout" method="post"><button>Keluar</button></form></header>
    {message.saved && <div className="form-success">Perusahaan {message.saved} berhasil dibuat.</div>}{message.error && <div className="form-error">Operasi gagal. Periksa data atau kode perusahaan.</div>}
    <div className="platform-actions"><a href="/platform/audit">Audit platform</a><a href="/platform/logins">Riwayat login</a></div>
    <div className="company-list">{companies.map(company => <article key={company.id}><div><strong>{company.name}</strong><small>{company.code} · {company.status}</small></div><div className="company-actions"><b>{company._count.employees} karyawan</b><form action="/api/platform/companies/status" method="post"><input type="hidden" name="companyId" value={company.id}/><select name="status" defaultValue={company.status}><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option></select><button type="submit">Ubah</button></form></div></article>)}</div>
    <form action="/api/platform/companies" method="post" className="create-company"><h2>Tambah perusahaan</h2><div><label>Kode<input name="code" placeholder="CONTOH_ID" required /></label><label>Nama perusahaan<input name="name" required /></label><label>Email<input name="email" type="email" /></label><label>Zona waktu<select name="timezone" defaultValue="Asia/Makassar"><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></label></div><button type="submit">Tambah perusahaan</button></form>
  </section></main>;
}

