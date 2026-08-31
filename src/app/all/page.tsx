import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { AllPage } from "@/components/sites/aihot-virxact-com-e007b012/all-a0f25776/AllPage";
import {
  ALL_ITEMS,
  dynamicDayGroups,
  shiftItemsToBase,} from "@/components/sites/aihot-virxact-com-e007b012/shared/data";
import { fullDateLabel, todayCstIso } from "@/components/sites/aihot-virxact-com-e007b012/shared/dates";
import { readMonitorReport } from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-report";
import {
  monitorDayGroups,
  monitorStoriesForView,
  monitorStoryToNewsItem,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-view";

export const metadata: Metadata = {
  title: "全部动态 · 早筛情报站",
  description:"早筛竞品资讯全量信息流：企业官网、期刊文献、会议、监管机构与社交媒体。",};

// 时间戳跟随服务器(东八区)每次请求计算，不做静态预渲染
export const dynamic = "force-dynamic";

export default async function All() {
  const today = todayCstIso();
  const report = await readMonitorReport();
  const usesLedgerReport = report?.schema_version === 2;
  const liveItems = usesLedgerReport
    ? monitorStoriesForView(report, "all").map(monitorStoryToNewsItem).filter((item) => item.date)
    : [];
  const items = usesLedgerReport ? liveItems : shiftItemsToBase(ALL_ITEMS, today);
  return (
    <SiteShell>
      <AllPage
        subtitle={`${fullDateLabel(today)} · 早筛竞品资讯全量信息流`}
        dayGroups={usesLedgerReport ? monitorDayGroups(items) : dynamicDayGroups(today)}
        items={items}/>
    </SiteShell>
  );
}
