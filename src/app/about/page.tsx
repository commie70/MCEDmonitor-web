import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { AboutPage } from "@/components/sites/aihot-virxact-com-e007b012/root-8a5edab2/AboutPage";

export const metadata: Metadata = {
  title: "关于 · 早筛情报站",
  description:"关于早筛情报站：每天抓早筛圈的动静， AI 打时间戳、去噪音、评分。",};

export default function About() {
  return (
    <SiteShell>
      <AboutPage />
    </SiteShell>
  );
}
