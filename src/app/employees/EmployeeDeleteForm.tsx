"use client";

export function EmployeeDeleteForm({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  return <form action="/api/employees/delete" method="post" onSubmit={(event) => {
    if (!window.confirm(`Yakin ingin menghapus karyawan ${employeeName}? Data akan dinonaktifkan dan tetap tersimpan dalam riwayat.`)) event.preventDefault();
  }}>
    <input type="hidden" name="employeeId" value={employeeId}/>
    <button type="submit" className="danger-button">Hapus karyawan</button>
  </form>;
}
