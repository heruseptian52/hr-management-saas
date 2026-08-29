import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function PlatformDashboard() {
  const session = await readSession();
  if (!session || session.platformRole !== "SUPER_ADMIN") redirect("/login");
  const companies = await db.company.findMany({ where: { deletedAt: null }, include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } });
  return <main className="platform-page"><section className="platform-card"><header><div><span className="eyebrow">SUPER ADMIN PLATFORM</span><h1>Semua perusahaan</h1><p>Statistik dipisahkan per tenant dan tidak menggabungkan data operasional.</p></div><form action="/api/auth/logout" method="post"><button>Keluar</button></form></header>
    <div className="company-list">{companies.map(company => <article key={company.id}><div><strong>{company.name}</strong><small>{company.code} · {company.status}</small></div><b>{company._count.employees} karyawan</b></article>)}</div>
  </section></main>;
}

