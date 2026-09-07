import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ensureSchedulingRuleSchema } from "@/lib/scheduling-rule-schema";
import { requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

const DAYS=[{value:1,label:"Sen"},{value:2,label:"Sel"},{value:3,label:"Rab"},{value:4,label:"Kam"},{value:5,label:"Jum"},{value:6,label:"Sab"},{value:0,label:"Min"}];
const strings=(value:unknown)=>Array.isArray(value)?value.map(String):[];
const numbers=(value:unknown)=>Array.isArray(value)?value.map(Number):[];
const validMonth=(value?:string)=>/^\d{4}-\d{2}$/.test(value??"")?value!:new Date().toISOString().slice(0,7);

export default async function GeneratorPage({searchParams}:{searchParams:Promise<{month?:string;branchId?:string;departmentId?:string;saved?:string;error?:string}>}) {
  let tenant; try { tenant=await requireTenant(); } catch { redirect("/login"); }
  const permissions=tenant.membership.role.permissions;
  if(!hasPermission(permissions,"schedules","create")) redirect("/schedules");
  await ensureSchedulingRuleSchema();
  const query=await searchParams, month=validMonth(query.month), branchId=query.branchId??"", departmentId=query.departmentId??"";
  const [positions,shifts,branches,departments,employees]=await Promise.all([
    db.position.findMany({where:{companyId:tenant.companyId,deletedAt:null},include:{scheduleRule:true},orderBy:{name:"asc"}}),
    db.shift.findMany({where:{companyId:tenant.companyId,deletedAt:null},orderBy:[{startTime:"asc"},{name:"asc"}]}),
    db.branch.findMany({where:{companyId:tenant.companyId,deletedAt:null},orderBy:{name:"asc"}}),
    db.department.findMany({where:{companyId:tenant.companyId,deletedAt:null},orderBy:{name:"asc"}}),
    db.employee.findMany({where:{companyId:tenant.companyId,deletedAt:null,employmentStatus:"ACTIVE",...(branchId?{branchId}:{}),...(departmentId?{departmentId}:{})},select:{id:true,fullName:true,employeeNumber:true,positionId:true,position:{select:{name:true}}},orderBy:[{position:{name:"asc"}},{fullName:"asc"}]}),
  ]);
  return <main className="settings-page"><section className="settings-card generator-card">
    <header><div><span className="eyebrow">PANBOY HR</span><h1>Generator Jadwal</h1><p>Atur shift dan hari libur setiap jabatan, lalu buat jadwal dalam satu tempat.</p></div><a href="/schedules">Kembali ke Jadwal</a></header>
    {query.saved&&<div className="form-success">Semua aturan jabatan berhasil disimpan.</div>}{query.error&&<div className="form-error">Pengaturan gagal diproses. Periksa data lalu coba kembali.</div>}
    <form action="/api/schedules/generator-settings" method="post" className="generator-form">
      <section className="generator-step"><div className="step-number">1</div><div className="step-content"><h2>Pilih periode jadwal</h2><div className="generator-filters">
        <label>Bulan<input type="month" name="month" defaultValue={month} required/></label>
        <label>Cabang<select name="branchId" defaultValue={branchId}><option value="">Semua cabang</option>{branches.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Departemen<select name="departmentId" defaultValue={departmentId}><option value="">Semua departemen</option>{departments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Pola<select name="rotation" defaultValue="DAILY"><option value="DAILY">Rotasi harian</option><option value="WEEKLY">Rotasi mingguan</option><option value="FIXED">Shift tetap</option></select></label>
      </div></div></section>
      <section className="generator-step"><div className="step-number">2</div><div className="step-content"><h2>Atur berdasarkan jabatan</h2><p className="muted">Centang shift yang boleh digunakan dan hari yang tidak boleh libur. Kosongkan shift jika jabatan boleh menggunakan semua shift.</p>
        <div className="generator-position-list">{positions.map(position=>{const allowed=new Set(strings(position.scheduleRule?.allowedShiftIds)),blocked=new Set(numbers(position.scheduleRule?.forbiddenOffWeekdays));return <article key={position.id} className="generator-position-row">
          <input type="hidden" name="positionId" value={position.id}/><div className="position-name"><small>{position.code}</small><b>{position.name}</b></div>
          <fieldset><legend>Shift diperbolehkan</legend><div className="inline-checks">{shifts.map(shift=><label key={shift.id} style={{borderColor:shift.color}}><input type="checkbox" name={`shift__${position.id}`} value={shift.id} defaultChecked={allowed.has(shift.id)}/><span>{shift.name}</span></label>)}</div></fieldset>
          <fieldset><legend>Tidak boleh libur</legend><div className="inline-checks day-checks">{DAYS.map(day=><label key={day.value}><input type="checkbox" name={`off__${position.id}`} value={day.value} defaultChecked={blocked.has(day.value)}/><span>{day.label}</span></label>)}</div></fieldset>
        </article>})}{!positions.length&&<div className="empty-state"><p>Belum ada jabatan. Tambahkan jabatan terlebih dahulu.</p></div>}</div>
      </div></section>
      <section className="generator-step"><div className="step-number">3</div><div className="step-content"><h2>Pilih karyawan yang masuk jadwal</h2><p className="muted">Karyawan dikelompokkan berdasarkan jabatan. Centang siapa saja; jabatan berbeda boleh dicampur dalam satu jadwal.</p><div className="generator-position-list">{positions.map(position=>{const members=employees.filter(employee=>employee.positionId===position.id);return members.length?<article className="generator-position-row" key={`employees-${position.id}`}><div className="position-name"><small>{members.length} karyawan</small><b>{position.name}</b></div><div className="inline-checks">{members.map(employee=><label key={employee.id}><input type="checkbox" name="employeeId" value={employee.id} defaultChecked/><span>{employee.fullName}</span></label>)}</div></article>:null})}{employees.filter(employee=>!employee.positionId).length>0&&<article className="generator-position-row"><div className="position-name"><b>Tanpa jabatan</b></div><div className="inline-checks">{employees.filter(employee=>!employee.positionId).map(employee=><label key={employee.id}><input type="checkbox" name="employeeId" value={employee.id} defaultChecked/><span>{employee.fullName}</span></label>)}</div></article>}</div></div></section>
      <section className="generator-step generator-final"><div className="step-number">4</div><div className="step-content"><h2>Buat jadwal</h2><p>Sistem akan memakai karyawan terpilih, jumlah libur, aturan jabatan, aturan departemen, dan shift yang dipilih.</p><div className="generator-actions"><button name="action" value="save" className="secondary-button">Simpan aturan saja</button><button name="action" value="generate" disabled={!employees.length||!positions.length||!shifts.length}>Simpan & Generate Jadwal</button></div></div></section>
    </form>
  </section></main>;
}
