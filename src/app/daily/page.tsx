import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { DailyPage } from "@/components/sites/aihot-virxact-com-e007b012/daily-8ad2b380/DailyPage";

export const metadata: Metadata = {
  title: "监测日报 · 早筛情报站",
  description:"证据优先的早筛竞品日报：权威信源、事件账本、重要性分级与高风险人工复核。",};

export default function Daily() {
  return (
    <SiteShell>
      <DailyPage />
    </SiteShell>
  );
}
