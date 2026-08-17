import { NextResponse } from "next/server";
import {
  pageParams,
  readMonitorReport,
  reportMissingResponse,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-report";
import { API_CACHE_HEADERS } from "@/components/sites/aihot-virxact-com-e007b012/shared/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/stories — 监测故事线(按热度排序,含 AI 摘要与评分);?offset=/limit= 分页(limit ≤100,默认 50)。
 */
export async function GET(request: Request) {
  const report = await readMonitorReport();
  if (!report) return reportMissingResponse();

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
