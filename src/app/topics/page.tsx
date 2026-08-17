import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { TopicsPage } from "@/components/sites/aihot-virxact-com-e007b012/topics-c73cb6e4/TopicsPage";

export const metadata: Metadata = {
  title: "主题 · 早筛情报站",
  description:"公司与产品、技术方向、研究类型——按主题看早筛竞品，点击卡片展开对应精选集。",};

export default function Topics() {
  return (
    <SiteShell>
      <TopicsPage />
    </SiteShell>
  );
}
