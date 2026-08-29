import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"HR Management SaaS",description:"Multi-company HR & employee management platform"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
