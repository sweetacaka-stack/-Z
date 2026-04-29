import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuraGen 产品模特图生成器",
  description: "上传产品白底图，生成模特手拿产品的生活方式图片。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
