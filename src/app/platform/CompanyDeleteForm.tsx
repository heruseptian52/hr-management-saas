"use client";

export function CompanyDeleteForm({ companyId, companyName }: { companyId: string; companyName: string }) {
  return <form
    action="/api/platform/companies/delete"
    method="post"
    className="company-delete-form"
    onSubmit={(event) => {
      const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus perusahaan ${companyName}?\n\nPerusahaan akan dinonaktifkan dan disembunyikan. Data tetap disimpan agar tidak hilang permanen.`);
      if (!confirmed) event.preventDefault();
    }}
  >
    <input type="hidden" name="companyId" value={companyId}/>
    <button type="submit" className="danger-button">Hapus perusahaan</button>
  </form>;
}
