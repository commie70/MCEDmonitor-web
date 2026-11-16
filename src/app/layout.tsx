import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "早筛情报站", template: "%s · 早筛情报站" },
  description:
    "国内外癌症早筛产品的性能、技术路线、癌种覆盖与报证审批进度持续监测：证据库 + 事件流，每条数据可追溯到公开信源。",
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1416" },
  ],
};

/** 预水合主题脚本：首帧即按用户选择或系统偏好着色，避免闪烁。键与 use-theme.ts 一致。 */
const themeInit = `(function(){try{var m=localStorage.getItem('mced-theme')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var el=document.documentElement;el.setAttribute('data-theme',d?'dark':'light');el.style.colorScheme=d?'dark':'light';}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
