import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { AllPage } from "@/components/sites/aihot-virxact-com-e007b012/all-a0f25776/AllPage";
import {
  ALL_ITEMS,
  dynamicDayGroups,
  shiftItemsToBase,} from "@/components/sites/aihot-virxact-com-e007b012/shared/data";
import { fullDateLabel, todayCstIso } from "@/components/sites/aihot-virxact-com-e007b012/shared/dates";

export const metadata: Metadata = {
  title: "全部动态 · 早筛情报站",
  description:"早筛竞品资讯全量信息流：企业官网、期刊文献、会议、监管机构与社交媒体。",};

// 时间戳跟随服务器(东八区)每次请求计算，不做静态预渲染
export const dynamic = "force-dynamic";

export default function All() {
  const today = todayCstIso();
  return (
    <SiteShell>
      <AllPage
        subtitle={`${fullDateLabel(today)} · 早筛竞品资讯全量信息流`}
        dayGroups={dynamicDayGroups(today)}
        items={shiftItemsToBase(ALL_ITEMS, today)}/>
    </SiteShell>
  );
}
