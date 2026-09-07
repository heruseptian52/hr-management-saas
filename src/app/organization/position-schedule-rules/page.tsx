import { ensureSchedulingRuleSchema } from "@/lib/scheduling-rule-schema";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

const DAYS = [{value:1,label:"Senin"},{value:2,label:"Selasa"},{value:3,label:"Rabu"},{value:4,label:"Kamis"},{value:5,label:"Jumat"},{value:6,label:"Sabtu"},{value:0,label:"Minggu"}];
const strings=(value:unknown)=>Array.isArray(value)?value.map(String):[];
const numbers=(value:unknown)=>Array.isArray(value)?value.map(Number):[];

export default async function PositionScheduleRulesPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}) {
  let tenant; try { tenant=await requireTenant(); } catch { redirect("/login"); }
  await ensureSchedulingRuleSchema();
  const permissions=tenant.membership.role.permissions;
  if(!hasPermission(permissions,"positions","view")) redirect("/dashboard");
  const editable=hasPermission(permissions,"positions","edit");
  const [positions,shifts]=await Promise.all([
    db.position.findMany({where:{companyId:tenant.companyId,deletedAt:null},include:{scheduleRule:true},orderBy:{name:"asc"}}),
    db.shift.findMany({where:{companyId:tenant.companyId,deletedAt:null},orderBy:[{startTime:"asc"},{name:"asc"}]})
  ]);
  const message=await searchParams;
  return <main className="settings-page"><section className="settings-card">
    <header><div><span className="eyebrow">PANBOY HR · PENJADWALAN</span><h1>Aturan shift berdasarkan jabatan</h1><p>Atur shift dan hari libur khusus Kasir, Driver, Admin, Leader, dan jabatan lain.</p></div><div className="header-actions"><a href="/organization/schedule-rules">Aturan departemen</a><a href="/organization">Kembali</a></div></header>
    {message.saved&&<div className="form-success">Aturan jabatan berhasil disimpan.</div>}{message.error&&<div className="form-error">Aturan gagal disimpan.</div>}
    <div className="rule-help"><b>Prioritas aturan</b><span>Jika karyawan memiliki aturan departemen dan jabatan, shift harus memenuhi keduanya. Larangan hari libur dari keduanya digabungkan.</span></div>
    <div className="department-rule-list">{positions.map(position=>{const allowed=new Set(strings(position.scheduleRule?.allowedShiftIds));const blocked=new Set(numbers(position.scheduleRule?.forbiddenOffWeekdays));return <form key={position.id} action="/api/organization/position-schedule-rules" method="post" className="department-rule-card">
      <input type="hidden" name="positionId" value={position.id}/><div className="department-rule-title"><div><span>{position.code}</span><h2>{position.name}</h2></div><label>Pola<select name="rotation" defaultValue={position.scheduleRule?.rotation??"DAILY"} disabled={!editable}><option value="DAILY">Rotasi harian</option><option value="WEEKLY">Rotasi mingguan</option><option value="FIXED">Shift tetap</option></select></label></div>
      <fieldset disabled={!editable}><legend>Shift yang diperbolehkan</legend><p>Kosong berarti tidak memberi batasan tambahan.</p><div className="rule-check-grid">{shifts.map(shift=><label key={shift.id} className="rule-check"><input type="checkbox" name="allowedShiftIds" value={shift.id} defaultChecked={allowed.has(shift.id)}/><span style={{borderLeftColor:shift.color}}><b>{shift.name}</b><small>{shift.startTime}–{shift.endTime}</small></span></label>)}</div></fieldset>
      <fieldset disabled={!editable}><legend>Hari yang tidak boleh libur</legend><div className="rule-check-grid days">{DAYS.map(day=><label key={day.value} className="rule-check"><input type="checkbox" name="forbiddenOffWeekdays" value={day.value} defaultChecked={blocked.has(day.value)}/><span><b>{day.label}</b></span></label>)}</div></fieldset>
      {editable&&<button>Simpan aturan {position.name}</button>}
    </form>})}</div>
  </section></main>;
}
