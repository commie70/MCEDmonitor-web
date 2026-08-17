import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { DailyPage } from "@/components/sites/aihot-virxact-com-e007b012/daily-8ad2b380/DailyPage";

export const metadata: Metadata = {
  title: "监测日报 · 早筛情报站",
  description:"每日自动监测早筛竞品： PubMed 新研究、Google News 市场动态、openFDA 报证审批，以及 NMPA/ASCO/ESMO/AACR 人工核查通道。",};

export default function Daily() {
  return (
    <SiteShell>
      <DailyPage />
    </SiteShell>
  );
}
