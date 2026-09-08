import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { EmployeeImportDialog } from "./EmployeeImportDialog";
import { EmployeeBulkTable } from "./EmployeeBulkTable";
import { QuickAddSelect } from "./QuickAddSelect";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; error?: string; q?: string }> }) {
  let tenant; try { tenant = await requirePermission("employees", "view"); } catch { redirect("/dashboard"); }
  const query = await searchParams;
  const search = query.q?.trim();
  const [employees, branches, departments, positions] = await Promise.all([
    db.employee.findMany({
      where: { companyId: tenant.companyId, deletedAt: null, ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { employeeNumber: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) },
      select: { id: true, employeeNumber: true, fullName: true, email: true, employmentStatus: true, branch: { select: { name: true } }, department: { select: { name: true } }, position: { select: { name: true } } },
      // Group the list for quick HR setup: department first, then position,
      // then employee name. This keeps all Pramuniaga/Kasir/etc. together.
      orderBy: [{ department: { name: "asc" } }, { position: { name: "asc" } }, { fullName: "asc" }],
      take: 100
    }),
    db.branch.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }),
    db.department.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }),
    db.position.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }),
  ]);
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Data karyawan</h1><p>{employees.length} data ditampilkan dari {tenant.membership.company.name}.</p></div><a href="/dashboard">Kembali</a></header>
    {query.saved && <div className="form-success">Karyawan berhasil ditambahkan.</div>}{query.deleted && <div className="form-success">Karyawan berhasil dinonaktifkan.</div>}{query.error && <div className="form-error">Data gagal diproses. Periksa isian dan izin Anda.</div>}
    <div className="standard-toolbar"><form className="search-form"><input name="q" defaultValue={search} placeholder="Cari nama, NIK, atau email"/><button>Cari</button></form><div className="toolbar-actions">{hasPermission(tenant.membership.role.permissions, "employees", "create") && <><a href="#tambah-karyawan">+ Tambah</a><EmployeeImportDialog/></>}{hasPermission(tenant.membership.role.permissions, "employees", "export") && <a href={`/api/employees/export${search ? `?q=${encodeURIComponent(search)}` : ""}`}>Export Excel</a>}<a href="/api/employees/template">Download Template</a><a href="/employees/imports">Riwayat Import</a></div></div>
    <EmployeeBulkTable employees={employees} branches={branches.map(({id,name})=>({id,name}))} departments={departments.map(({id,name})=>({id,name}))} positions={positions.map(({id,name})=>({id,name}))} canEdit={hasPermission(tenant.membership.role.permissions,"employees","edit")} canDelete={hasPermission(tenant.membership.role.permissions,"employees","delete")} canExport={hasPermission(tenant.membership.role.permissions,"employees","export")}/>
    {hasPermission(tenant.membership.role.permissions, "employees", "create") && <form id="tambah-karyawan" className="settings-form employee-form" action="/api/employees" method="post"><h2 className="wide">Tambah karyawan</h2><label>NIK internal<input name="employeeNumber" required/></label><label>Nama lengkap<input name="fullName" required/></label><label>Email<input name="email" type="email"/></label><label>Nomor HP<input name="phone"/></label><label>Tanggal bergabung<input name="joinDate" type="date" required/></label><label>Jenis kerja<select name="employmentType"><option value="PERMANENT">Tetap</option><option value="CONTRACT">Kontrak</option><option value="INTERNSHIP">Magang</option><option value="FREELANCE">Freelance</option><option value="PART_TIME">Paruh waktu</option></select></label><QuickAddSelect kind="branch" fieldName="branchId" options={branches.map(({id,name})=>({id,name}))} canAdd={hasPermission(tenant.membership.role.permissions,"branches","create")}/><QuickAddSelect kind="department" fieldName="departmentId" options={departments.map(({id,name})=>({id,name}))} canAdd={hasPermission(tenant.membership.role.permissions,"departments","create")}/><QuickAddSelect kind="position" fieldName="positionId" options={positions.map(({id,name})=>({id,name}))} canAdd={hasPermission(tenant.membership.role.permissions,"positions","create")}/><label>Libur per bulan<input name="monthlyDaysOff" type="number" min="0" max="31" defaultValue="4" required/></label><button className="wide" type="submit">Tambah karyawan</button></form>}
  </section></main>;
}
