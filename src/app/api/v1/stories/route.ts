import { NextResponse } from "next/server";
import { pageParams, readMonitorReport } from "@/lib/monitor-report";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/stories — 监测流水线的发布事件(按等级、重要性、事件时间排序)；
 * ?offset= / ?limit= 分页(limit ≤100，默认 50)。含证据库里程碑的完整时间线见 /api/v1/events。
 */
export async function GET(request: Request) {
  const report = await readMonitorReport();
  if (!report) {
    return NextResponse.json({ error: "monitor_report_missing", hint: "npm run monitor:project" }, { status: 503 });
  }
  const { offset, limit } = pageParams(request.url, 50, 100);
  return NextResponse.json(
    {
      generated_at: report.generated_at,
      window_since: report.window_since,
      count: report.stories.length,
      offset,
      limit,
      stories: report.stories.slice(offset, offset + limit),
    },
    { headers: API_CACHE_HEADERS }
  );
}
