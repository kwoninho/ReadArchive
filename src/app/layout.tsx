import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReadArchive - 나만의 독서 아카이브",
  description:
    "책 이름만 입력하면 자동으로 책 정보를 수집하고, 독서 현황을 관리하세요.",
  openGraph: {
    title: "ReadArchive - 나만의 독서 아카이브",
    description:
      "책 이름만 입력하면 자동으로 책 정보를 수집하고, 독서 현황을 관리하세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "ReadArchive",
  },
  twitter: {
    card: "summary",
    title: "ReadArchive - 나만의 독서 아카이브",
    description:
      "책 이름만 입력하면 자동으로 책 정보를 수집하고, 독서 현황을 관리하세요.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
