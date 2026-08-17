import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "早筛情报站 — 早筛竞品动态聚合 · 每日精选监测",
  description:"早筛情报站：癌症早筛竞品产品新闻监测与信息看板，聚合企业官网、期刊文献、会议摘要、监管机构的竞品动态，每日精选重点。",};

const themeInit = `(function(){try{var m=localStorage.getItem('mced-theme')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var el=document.documentElement;el.setAttribute('data-theme',d?'dark':'light');el.style.colorScheme=d?'dark':'light';}catch(e){}})()`;

export default function RootLayout({
  children,}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="light" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }}/>
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
