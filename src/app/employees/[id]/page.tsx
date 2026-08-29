import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function EmployeeDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  let tenant; try { tenant = await requirePermission("employees", "view"); } catch { redirect("/dashboard"); }
  const { id } = await params;
  const [employee, branches, departments, positions, history] = await Promise.all([
    db.employee.findFirst({ where: { id, companyId: tenant.companyId, deletedAt: null }, include: { branch: true, department: true, position: true } }),
    db.branch.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.department.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }), db.position.findMany({ where: { companyId: tenant.companyId, deletedAt: null } }),
    db.auditLog.findMany({ where: { companyId: tenant.companyId, entityType: "Employee", entityId: id }, include: { actor: { select: { fullName: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  if (!employee) notFound();
  const message = await searchParams;
  const editable = hasPermission(tenant.membership.role.permissions, "employees", "edit");
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">KARYAWAN · {employee.employeeNumber}</span><h1>{employee.fullName}</h1><p>{employee.position?.name ?? "Tanpa jabatan"} · {employee.department?.name ?? "Tanpa departemen"}</p></div><a href="/employees">Kembali</a></header>
    {message.saved && <div className="form-success">Data karyawan berhasil diperbarui.</div>}{message.error && <div className="form-error">Perubahan gagal disimpan.</div>}
    <form className="settings-form employee-form" action="/api/employees/update" method="post"><input type="hidden" name="employeeId" value={employee.id}/><label>Nama lengkap<input name="fullName" defaultValue={employee.fullName} required disabled={!editable}/></label><label>Email<input name="email" type="email" defaultValue={employee.email ?? ""} disabled={!editable}/></label><label>Nomor HP<input name="phone" defaultValue={employee.phone ?? ""} disabled={!editable}/></label><label>Jenis kerja<select name="employmentType" defaultValue={employee.employmentType} disabled={!editable}><option value="PERMANENT">Tetap</option><option value="CONTRACT">Kontrak</option><option value="INTERNSHIP">Magang</option><option value="FREELANCE">Freelance</option><option value="PART_TIME">Paruh waktu</option></select></label><label>Status<select name="employmentStatus" defaultValue={employee.employmentStatus} disabled={!editable}><option>ACTIVE</option><option>INACTIVE</option><option>RESIGNED</option><option>TERMINATED</option></select></label><label>Libur per bulan<input name="monthlyDaysOff" type="number" min="0" max="31" defaultValue={employee.monthlyDaysOff} disabled={!editable}/></label><label>Cabang<select name="branchId" defaultValue={employee.branchId ?? ""} disabled={!editable}><option value="">Tanpa cabang</option>{branches.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Departemen<select name="departmentId" defaultValue={employee.departmentId ?? ""} disabled={!editable}><option value="">Tanpa departemen</option>{departments.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Jabatan<select name="positionId" defaultValue={employee.positionId ?? ""} disabled={!editable}><option value="">Tanpa jabatan</option>{positions.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>{editable && <button className="wide">Simpan perubahan</button>}</form>
    <h2>Riwayat perubahan</h2><div className="timeline">{history.map(item => <article key={item.id}><span>{item.createdAt.toLocaleString("id-ID")}</span><strong>{item.action}</strong><p>{item.actor?.fullName ?? "System"}</p></article>)}{history.length === 0 && <p>Belum ada riwayat.</p>}</div>
  </section></main>;
}
