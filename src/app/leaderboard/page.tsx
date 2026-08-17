import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { CompetitorBoard } from "@/components/sites/aihot-virxact-com-e007b012/shared/CompetitorBoard";
import { ProspectiveTable } from "@/components/sites/aihot-virxact-com-e007b012/shared/ProspectiveTable";

export const metadata: Metadata = {
  title: "早筛产品看板 · 早筛情报站",
  description:"癌症早筛企业深度调研看板： 19 家国内外企业技术路线、产品布局、报证审批与性能对照(特异性 / 灵敏度 + 检出分期 + TOO)，数据来源于发表文献、监管审评资料与会议摘要。",};

export default function Leaderboard() {
  return (
    <SiteShell>
      <div>
        <header className="pt-[6px]">
          <h1 className="m-0 text-[23px] leading-[1.2] font-bold tracking-[-0.01em] text-mc-ink">
            早筛产品看板
          </h1>
          <p className="mt-[5px] max-w-[900px] text-[12px] leading-[1.6] text-mc-ink2">
            癌症早筛企业深度调研(聚焦多癌种液体活检)· 19 家国内外企业 · 锚定 世和基因
            CanScan® 鹰眼 · 来源：发表文献、监管审评资料(NMPA / CMDE、FDA、HSA、CE)及会议摘要，国内性能不采公司官网口径 · 点击任意企业行展开性能与测序参数 · 调研基线 2026-06-25，信源核验 2026-08-16
          </p>
          <hr className="mt-[10px] mb-[8px] border-0 border-t border-mc-line-soft" />
        </header>
        <CompetitorBoard />
        <ProspectiveTable />
      </div>
    </SiteShell>
  );
}
