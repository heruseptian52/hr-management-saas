"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Shift = { id: string; code: string; name: string; color: string };
type Cell = { id: string; day: number; shiftId: string | null; type: "WORK" | "OFF" };
type Row = { employeeId: string; employeeName: string; cells: Cell[] };

export function ScheduleGrid({ rows, shifts, days, month, editable }: { rows: Row[]; shifts: Shift[]; days: number; month: string; editable: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const shiftMap = new Map(shifts.map(item => [item.id, item]));

  async function save(assignmentId: string, shiftId: string) {
    if (!editable || saving) return;
    setSaving(assignmentId); setMessage("");
    const body = new FormData(); body.set("assignmentId", assignmentId); body.set("shiftId", shiftId); body.set("returnMonth", month);
    const response = await fetch("/api/schedules/assignment", { method: "POST", body, headers: { Accept: "application/json" } });
    setSaving(null);
    if (!response.ok) return setMessage("Perubahan gagal disimpan.");
    setMessage("Jadwal tersimpan."); router.refresh();
  }

  function drag(event: React.DragEvent, shiftId: string) { event.dataTransfer.setData("text/shift-id", shiftId); event.dataTransfer.effectAllowed = "copy"; }
  function drop(event: React.DragEvent, assignmentId: string) { event.preventDefault(); const shiftId = event.dataTransfer.getData("text/shift-id"); if (shiftId) void save(assignmentId, shiftId); }

  return <>
    {editable && <div className="drag-palette"><b>Tarik shift ke tanggal:</b>{shifts.map(item => <button key={item.id} draggable onDragStart={event => drag(event, item.id)} style={{ borderColor: item.color }} title={`Tarik ${item.name} ke tanggal`}>{item.code}</button>)}<button draggable onDragStart={event => drag(event, "OFF")} className="off-chip">LIBUR</button><span>{message}</span></div>}
    <div className="schedule-table"><div className="schedule-row schedule-heading" style={{ gridTemplateColumns: `180px repeat(${days},minmax(42px,1fr))` }}><b>Karyawan</b>{Array.from({ length: days }, (_, index) => <b key={index}>{index + 1}</b>)}</div>{rows.map(row => <div className="schedule-row" style={{ gridTemplateColumns: `180px repeat(${days},minmax(42px,1fr))` }} key={row.employeeId}><strong>{row.employeeName}</strong>{row.cells.map(cell => {
      const shift = cell.shiftId ? shiftMap.get(cell.shiftId) : null, value = cell.type === "OFF" ? "OFF" : cell.shiftId ?? "OFF";
      return editable ? <div className={`schedule-drop-cell ${saving === cell.id ? "saving" : ""}`} key={cell.id} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, cell.id)} draggable onDragStart={event => drag(event, value)} style={{ borderTopColor: shift?.color ?? "#cbd5e1" }}><select aria-label={`${row.employeeName} tanggal ${cell.day}`} value={value} onChange={event => void save(cell.id, event.target.value)} disabled={saving !== null}><option value="OFF">L</option>{shifts.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select></div> : <span className="locked-cell" key={cell.id} style={{ borderTopColor: shift?.color ?? "#cbd5e1" }}>{cell.type === "OFF" ? "L" : shift?.code}</span>;
    })}</div>)}</div>
  </>;
}
