import { NextResponse } from "next/server";
import {
  readMonitorReport,
  reportMissingResponse,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-report";
import { API_CACHE_HEADERS } from "@/components/sites/aihot-virxact-com-e007b012/shared/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/daily — 每日监测摘要： AI 日报 + 热度前 5 故事线(精简字段)。
 */
export async function GET() {
  const report = await readMonitorReport();
  if (!report) return reportMissingResponse();

  const topStories = report.stories.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    company: s.company,
    heat: s.heat,
    badges: s.badges,
    summary: s.summary,
    score: s.score,
    reason: s.reason,}));

  return NextResponse.json(
    {
      generated_at: report.generated_at,
      window_since: report.window_since,
      digest: report.digest,
      top_stories: topStories,
    },
    { headers: API_CACHE_HEADERS }
  );
}
