"use client";
export function DocumentDeleteForm({ id, employeeId, title }: { id: string; employeeId: string; title: string }) {
  return <form action="/api/employees/documents" method="post" onSubmit={event => { if (!window.confirm(`Yakin ingin menghapus dokumen “${title}”?`)) event.preventDefault(); }}><input type="hidden" name="action" value="DELETE"/><input type="hidden" name="employeeId" value={employeeId}/><input type="hidden" name="id" value={id}/><button className="danger-button">Hapus</button></form>;
}
