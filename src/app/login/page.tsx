import { readSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const messages: Record<string, string> = {
  invalid_input: "Periksa kembali email dan password.",
  invalid_credentials: "Email atau password salah.",
  rate_limited: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
  company_unavailable: "Akun tidak memiliki perusahaan aktif.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await readSession();
  if (session) redirect(session.platformRole === "SUPER_ADMIN" ? "/platform" : "/dashboard");
  const error = (await searchParams).error;
  return <main className="auth-page">
    <section className="auth-brand">
      <span className="brand-mark">HR</span>
      <div><strong>HR Management</strong><small>Multi-Company Platform</small></div>
      <h1>Kelola tim dengan lebih teratur.</h1>
      <p>Jadwal, karyawan, absensi, dan laporan perusahaan dalam satu platform yang aman.</p>
      <div className="security-note">Data setiap perusahaan dipisahkan dan dilindungi.</div>
    </section>
    <form className="login-card" action="/api/auth/login" method="post">
      <span className="eyebrow">AKSES AMAN</span>
      <h2>Masuk ke akun</h2>
      <p>Gunakan akun yang diberikan perusahaan Anda.</p>
      {error && <div className="form-error" role="alert">{messages[error] ?? "Login gagal. Silakan coba lagi."}</div>}
      <label>Email<input name="email" type="email" autoComplete="email" placeholder="nama@perusahaan.com" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Minimal 8 karakter" minLength={8} required /></label>
      <button type="submit">Masuk</button>
      <small className="help-text">Lupa password? Hubungi HR Admin perusahaan Anda.</small>
    </form>
  </main>;
}
