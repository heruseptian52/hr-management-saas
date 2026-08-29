import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; q?: string }> }) {
  let tenant; try { tenant = await requirePermission("employees", "view"); } catch { redirect("/dashboard"); }
  const query = await searchParams;
  const search = query.q?.trim();
  const [employees, branches, departments, positions] = await Promise.all([
    db.employee.findMany({ where: { companyId: tenant.companyId, deletedAt: null, ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { employeeNumber: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) }, include: { branch: true, department: true, position: true }, orderBy: { fullName: "asc" }, take: 100 }),
    db.branch.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.department.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.position.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }),
  ]);
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Data karyawan</h1><p>{employees.length} data ditampilkan dari {tenant.membership.company.name}.</p></div><a href="/dashboard">Kembali</a></header>
    {query.saved && <div className="form-success">Karyawan berhasil ditambahkan.</div>}{query.error && <div className="form-error">Data gagal disimpan. Periksa NIK dan semua isian.</div>}
    <form className="search-form"><input name="q" defaultValue={search} placeholder="Cari nama, NIK, atau email"/><button>Cari</button></form>
    <div className="data-table"><div className="data-row employee heading"><b>NIK</b><b>Nama</b><b>Cabang</b><b>Departemen</b><b>Jabatan</b><b>Status</b></div>{employees.map(employee => <a href={`/employees/${employee.id}`} className="data-row employee employee-link" key={employee.id}><strong>{employee.employeeNumber}</strong><span>{employee.fullName}<small>{employee.email ?? ""}</small></span><span>{employee.branch?.name ?? "-"}</span><span>{employee.department?.name ?? "-"}</span><span>{employee.position?.name ?? "-"}</span><span>{employee.employmentStatus}</span></a>)}</div>
    {hasPermission(tenant.membership.role.permissions, "employees", "create") && <form className="settings-form employee-form" action="/api/employees" method="post"><h2 className="wide">Tambah karyawan</h2><label>NIK internal<input name="employeeNumber" required/></label><label>Nama lengkap<input name="fullName" required/></label><label>Email<input name="email" type="email"/></label><label>Nomor HP<input name="phone"/></label><label>Tanggal bergabung<input name="joinDate" type="date" required/></label><label>Jenis kerja<select name="employmentType"><option value="PERMANENT">Tetap</option><option value="CONTRACT">Kontrak</option><option value="INTERNSHIP">Magang</option><option value="FREELANCE">Freelance</option><option value="PART_TIME">Paruh waktu</option></select></label><label>Cabang<select name="branchId"><option value="">Tanpa cabang</option>{branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Departemen<select name="departmentId"><option value="">Tanpa departemen</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Jabatan<select name="positionId"><option value="">Tanpa jabatan</option>{positions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Libur per bulan<input name="monthlyDaysOff" type="number" min="0" max="31" defaultValue="4" required/></label><button className="wide" type="submit">Tambah karyawan</button></form>}
  </section></main>;
}
