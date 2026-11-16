import { NextResponse } from "next/server";
import { pageParams, readMonitorReport } from "@/lib/monitor-report";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

const CATEGORY_KEYS = ["regulatory", "academic", "research", "market"];

/**
 * GET /api/v1/items — 发布事件背后的可追溯证据条目；
 * ?category= 过滤，?offset= / ?limit= 分页(limit ≤200，默认 100)。
 */
export async function GET(request: Request) {
  const report = await readMonitorReport();
  if (!report) {
    return NextResponse.json({ error: "monitor_report_missing", hint: "npm run monitor:project" }, { status: 503 });
  }
  const category = new URL(request.url).searchParams.get("category");
  const filter = category && CATEGORY_KEYS.includes(category) ? category : null;
  const filtered = filter ? report.items.filter((item) => item.category === filter) : report.items;
  const { offset, limit } = pageParams(request.url, 100, 200);
  return NextResponse.json(
    {
      generated_at: report.generated_at,
      window_since: report.window_since,
      count: filtered.length,
      offset,
      limit,
      categories: report.categories,
      items: filtered.slice(offset, offset + limit),
    },
    { headers: API_CACHE_HEADERS }
  );
}
