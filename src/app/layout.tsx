import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "نظام توزيع نماذج الامتحان وادارة الطلاب | كلية الإمام مالك",
  description: "نظام تتبع وتأمين الوثائق عبر رموز QR الديناميكية",
};

import AntdConfig from "@/components/AntdConfig";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className={cairo.className} suppressHydrationWarning>
        <AntdConfig>
          {children}
        </AntdConfig>
      </body>
    </html>
  );
}
