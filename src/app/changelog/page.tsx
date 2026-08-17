import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { ChangelogPage } from "@/components/sites/aihot-virxact-com-e007b012/changelog-9433db80/ChangelogPage";

export const metadata: Metadata = {
  title: "更新日志 · 早筛情报站",
  description:"本项目数据更新与功能更新的自动化记录。",};

export default function Changelog() {
  return (
    <SiteShell>
      <ChangelogPage />
    </SiteShell>
  );
}
