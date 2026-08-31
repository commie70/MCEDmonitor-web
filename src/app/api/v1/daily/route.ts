import { NextResponse } from "next/server";
import {
  readMonitorReport,
  reportMissingResponse,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-report";
import { API_CACHE_HEADERS } from "@/components/sites/aihot-virxact-com-e007b012/shared/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/daily — 每日监测摘要：首次发布/实质更新且达到 L1/L2、通过证据与复核门禁的事件。
 */
export async function GET() {
  const report = await readMonitorReport();
  if (!report) return reportMissingResponse();

  const dailyIds = new Set(
    report.views?.daily_event_ids ?? report.stories.map((story) => story.id)
  );
  const topStories = report.stories
    .filter((story) => dailyIds.has(story.id))
    .slice(0, 5)
    .map((story) => ({
      id: story.id,
      title: story.title,
      company: story.company,
      heat: story.heat,
      badges: story.badges,
      summary: story.summary,
      score: story.score,
      reason: story.reason,
      publication_state: story.publication_state,
      level: story.level,
      evidence_confidence: story.evidence_confidence,
      score_breakdown: story.score_breakdown,
      review_status: story.review_status,
    }));

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
