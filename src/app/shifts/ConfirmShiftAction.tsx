"use client";
export function ConfirmShiftAction({id,action,label,name,danger=false}:{id:string;action:"TOGGLE"|"DELETE"|"DUPLICATE";label:string;name:string;danger?:boolean}) {
  return <form action="/api/shifts/manage" method="post" onSubmit={event=>{const text=action==="DELETE"?`Hapus permanen shift ${name}? Ini hanya berhasil jika shift belum pernah dipakai jadwal.`:action==="TOGGLE"?`${label} shift ${name}? Data jadwal lama tetap aman.`:`Buat salinan shift ${name}?`;if(!window.confirm(text))event.preventDefault();}}><input type="hidden" name="id" value={id}/><input type="hidden" name="action" value={action}/><button className={danger?"danger-button":"secondary-button"}>{label}</button></form>;
}
