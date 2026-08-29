import { requirePermission } from "@/lib/authorization";
import { redirect } from "next/navigation";

export default async function CompanySettings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  let tenant;
  try { tenant = await requirePermission("company", "view"); } catch { redirect("/dashboard"); }
  const company = tenant.membership.company;
  const message = await searchParams;
  return <main className="settings-page"><section className="settings-card"><header><div><span className="eyebrow">PANBOY HR</span><h1>Pengaturan perusahaan</h1><p>Perubahan hanya berlaku untuk {company.name}.</p></div><a href="/dashboard">Kembali</a></header>
    {message.saved && <div className="form-success">Pengaturan perusahaan berhasil disimpan.</div>}
    {message.error && <div className="form-error">Periksa kembali data yang diisi.</div>}
    <form action="/api/company" method="post" className="settings-form">
      <label>Nama perusahaan<input name="name" defaultValue={company.name} required /></label>
      <label>Email<input name="email" type="email" defaultValue={company.email ?? ""} /></label>
      <label>Nomor telepon<input name="phone" defaultValue={company.phone ?? ""} /></label>
      <label className="wide">Alamat<textarea name="address" defaultValue={company.address ?? ""} /></label>
      <label>Zona waktu<select name="timezone" defaultValue={company.timezone}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></label>
      <label>Mata uang<select name="currency" defaultValue={company.currency}><option>IDR</option><option>USD</option></select></label>
      <label>Bahasa utama<select name="defaultLanguage" defaultValue={company.defaultLanguage}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label>
      <label>Format tanggal<select name="dateFormat" defaultValue={company.dateFormat}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></label>
      <label>Warna utama<input name="primaryColor" type="color" defaultValue={company.primaryColor} /></label>
      <label>Warna kedua<input name="secondaryColor" type="color" defaultValue={company.secondaryColor} /></label>
      <button className="wide" type="submit">Simpan pengaturan</button>
    </form>
  </section></main>;
}

