import { NextResponse } from "next/server";
import { apiEvent } from "@/lib/api";
import { featured, hotEvents } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { monitorHealth, storiesForView } from "@/lib/monitor-report";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/daily — 最近一期监测日报：
 *  - digest / top_stories：本期首次发布与实质更新中达到 L1/L2 并通过门禁的事件(v1 字段)；
 *  - recent：近 31 天 L1/L2 事件(含证据库里程碑)；
 *  - health：监测运行健康度。
 */
export async function GET() {
  const { events, report, today } = await loadEvents();
  if (!report) {
    return NextResponse.json({ error: "monitor_report_missing", hint: "npm run monitor:project" }, { status: 503 });
  }
  const topStories = storiesForView(report, "daily")
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
      recent: featured(hotEvents(events, today, 31)).map(apiEvent),
      health: monitorHealth(report),
    },
    { headers: API_CACHE_HEADERS }
  );
}
