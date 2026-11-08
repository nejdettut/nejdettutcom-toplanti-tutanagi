import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Toplantı Tutanağı — nejdettut.com",
  description:
    "Toplantı notlarını veya transcript'i yapıştır — yapay zekâ katılımcıları, gündem maddelerini, kararları ve aksiyon maddelerini ayıklar. Word (.docx) olarak dışa aktarır.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
