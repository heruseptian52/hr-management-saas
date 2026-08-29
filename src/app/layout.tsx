import "./globals.css";

export const metadata = { title: "HR Management SaaS", description: "Secure multi-company HR platform" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}

