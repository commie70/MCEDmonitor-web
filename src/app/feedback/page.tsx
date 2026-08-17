import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { FeedbackPage } from "@/components/sites/aihot-virxact-com-e007b012/feedback-503528ab/FeedbackPage";

export const metadata: Metadata = {
  title: "反馈 · 早筛情报站",
  description:"数据勘误、监测维度建议与使用问题反馈。",};

export default function Feedback() {
  return (
    <SiteShell>
      <FeedbackPage />
    </SiteShell>
  );
}
