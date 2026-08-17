import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { FeaturedPage } from "@/components/sites/aihot-virxact-com-e007b012/root-8a5edab2/FeaturedPage";
import {
  FEATURED_ITEMS,
  dynamicDayGroups,
  shiftItemsToBase,} from "@/components/sites/aihot-virxact-com-e007b012/shared/data";
import { fullDateLabel, todayCstIso } from "@/components/sites/aihot-virxact-com-e007b012/shared/dates";

export const metadata: Metadata = {
  title: "精选 · 早筛情报站",
  description:"今日早筛竞品重点动态：编辑精选的产品发布、监管获批、临床数据与文献监测。",};

// 时间戳跟随服务器(东八区)每次请求计算，不做静态预渲染
export const dynamic = "force-dynamic";

export default function Home() {
  const today = todayCstIso();
  return (
    <SiteShell>
      <FeaturedPage
        subtitle={`${fullDateLabel(today)} · 今日竞品重点动态`}
        dayGroups={dynamicDayGroups(today)}
        items={shiftItemsToBase(FEATURED_ITEMS, today)}/>
    </SiteShell>
  );
}
