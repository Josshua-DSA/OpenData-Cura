import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "Tilik Jatim | Dashboard Kesehatan",
  description: "Dashboard analitik kesehatan Jawa Timur",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
