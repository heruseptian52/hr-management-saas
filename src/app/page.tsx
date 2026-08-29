import Link from "next/link";

export default function Home() {
  return <main className="home-page"><section className="card home-card">
    <div className="eyebrow">PANBOY HR</div>
    <h1>Kelola SDM lintas perusahaan dengan aman.</h1>
    <p>Platform HR multi-company untuk mengelola perusahaan, karyawan, struktur organisasi, shift, dan jadwal kerja dalam satu sistem.</p>
    <div className="home-actions">
      <Link className="primary-action" href="/login">Masuk ke PANBOY HR</Link>
      <a className="secondary-action" href="#fitur">Lihat fitur aktif</a>
    </div>
    <div className="grid" id="fitur">
      <div className="item"><strong>Multi-company</strong><span>Data setiap perusahaan terpisah.</span></div>
      <div className="item"><strong>Employee & RBAC</strong><span>Karyawan dan hak akses terkelola.</span></div>
      <div className="item"><strong>Shift & schedule</strong><span>Jadwal otomatis dan manual.</span></div>
    </div>
  </section></main>;
}
