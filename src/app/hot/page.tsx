import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { HotLivePage } from "@/components/sites/aihot-virxact-com-e007b012/hot-ec540172/HotLivePage";

export const metadata: Metadata = {
  title: "竞品热点榜 · 早筛情报站",
  description:"早筛竞品故事线热度榜：多信源聚类，按信道权重与 24 小时半衰期实时排序。",};

export default function Hot() {
  return (
    <SiteShell>
      <HotLivePage />
    </SiteShell>
  );
}
