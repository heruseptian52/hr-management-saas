"use client";
import { useState } from "react";

type Kind = "branch" | "department" | "position";
type Option = { id: string; name: string };
const labels = { branch: "Cabang", department: "Departemen", position: "Jabatan" };

export function QuickAddSelect({ kind, fieldName, options: initial, defaultValue = "", disabled = false, canAdd = false }: { kind: Kind; fieldName: string; options: Option[]; defaultValue?: string; disabled?: boolean; canAdd?: boolean }) {
  const [options, setOptions] = useState(initial), [value, setValue] = useState(defaultValue), [open, setOpen] = useState(false), [name, setName] = useState(""), [code, setCode] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    if (name.trim().length < 2) return alert(`Nama ${labels[kind].toLowerCase()} wajib diisi.`);
    setBusy(true); const response = await fetch("/api/organization/quick-add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name, code }) }); const json = await response.json(); setBusy(false);
    if (!response.ok) return alert(json.error);
    setOptions(current => [...current, { id: json.id, name: json.name }].sort((a, b) => a.name.localeCompare(b.name, "id"))); setValue(json.id); setOpen(false); setName(""); setCode("");
  }
  return <div className="quick-add-field"><label htmlFor={`quick-${fieldName}`}>{labels[kind]}</label><select id={`quick-${fieldName}`} name={fieldName} value={value} onChange={event => setValue(event.target.value)} disabled={disabled}><option value="">Tanpa {labels[kind].toLowerCase()}</option>{options.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{canAdd && !disabled && <button type="button" className="quick-add-button" onClick={() => setOpen(true)}>+ Tambah {labels[kind]}</button>}{open && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><section className="quick-add-modal" role="dialog" aria-modal="true"><header><div><b>Tambah {labels[kind]} Baru</b><small>Data tersimpan khusus perusahaan aktif</small></div><button type="button" onClick={() => setOpen(false)}>×</button></header><div><label>Nama {labels[kind]}<input value={name} onChange={event => setName(event.target.value)} autoFocus maxLength={100}/></label><label>Kode (opsional)<input value={code} onChange={event => setCode(event.target.value.toUpperCase())} maxLength={20} placeholder="Dibuat otomatis jika kosong"/></label><div className="quick-add-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Batal</button><button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Menyimpan..." : "Simpan & Pilih"}</button></div></div></section></div>}</div>;
}
