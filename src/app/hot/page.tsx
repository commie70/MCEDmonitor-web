import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { HotLivePage } from "@/components/sites/aihot-virxact-com-e007b012/hot-ec540172/HotLivePage";

export const metadata: Metadata = {
  title: "竞品热点榜 · 早筛情报站",
  description:"早筛竞品事件重要性榜：按 L1–L3、重要性总分与事件时间排序，并展示独立证据主体。",};

export default function Hot() {
  return (
    <SiteShell>
      <HotLivePage />
    </SiteShell>
  );
}
