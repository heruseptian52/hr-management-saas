"use client";
export function LeaveActions({ id, status, canApprove, canEdit, canDelete }: { id: string; status: string; canApprove: boolean; canEdit: boolean; canDelete: boolean }) {
  const confirmSubmit = (message: string) => (event: React.FormEvent<HTMLFormElement>) => { if (!confirm(message)) event.preventDefault(); };
  return <div className="leave-actions">
    {status === "PENDING" && canApprove && <><form action="/api/leave-requests" method="post" onSubmit={confirmSubmit("Setujui pengajuan ini?")}><input type="hidden" name="action" value="APPROVE"/><input type="hidden" name="id" value={id}/><input name="reviewNotes" placeholder="Catatan (opsional)"/><button>Setujui</button></form><form action="/api/leave-requests" method="post" onSubmit={confirmSubmit("Tolak pengajuan ini?")}><input type="hidden" name="action" value="REJECT"/><input type="hidden" name="id" value={id}/><input name="reviewNotes" placeholder="Alasan penolakan"/><button className="danger-button">Tolak</button></form></>}
    {status === "PENDING" && canEdit && <form action="/api/leave-requests" method="post" onSubmit={confirmSubmit("Batalkan pengajuan ini?")}><input type="hidden" name="action" value="CANCEL"/><input type="hidden" name="id" value={id}/><button className="secondary-button">Batalkan</button></form>}
    {canDelete && <form action="/api/leave-requests" method="post" onSubmit={confirmSubmit("Hapus pengajuan ini secara permanen?")}><input type="hidden" name="action" value="DELETE"/><input type="hidden" name="id" value={id}/><button className="danger-button">Hapus</button></form>}
  </div>;
}
