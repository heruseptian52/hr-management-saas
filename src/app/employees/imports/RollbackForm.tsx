"use client";
export function RollbackForm({ batchId, filename }: { batchId: string; filename: string }) {
  return <form action="/api/employees/import/rollback" method="post" onSubmit={event => { if (!window.confirm(`Batalkan import ${filename}? Hanya karyawan BARU dari batch ini yang akan dinonaktifkan. Data lama yang pernah diupdate tidak di-rollback.`)) event.preventDefault(); }}><input type="hidden" name="batchId" value={batchId}/><button className="danger-button">Rollback data baru</button></form>;
}
