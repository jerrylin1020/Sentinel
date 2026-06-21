import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — Your radar for market anomalies",
  description: "Anomaly signal radar for equities and crypto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
