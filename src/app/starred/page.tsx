import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { StarredPage } from "@/components/sites/aihot-virxact-com-e007b012/root-8a5edab2/StarredPage";

export const metadata: Metadata = {
  title: "收藏 · 早筛情报站",
  description:"本机收藏的早筛竞品动态，仅保存在当前浏览器。",};

export default function Starred() {
  return (
    <SiteShell>
      <StarredPage />
    </SiteShell>
  );
}
