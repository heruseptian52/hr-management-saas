import "./globals.css";

export const metadata = { title: "PANBOY HR", description: "Smart HR & Employee Management" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
