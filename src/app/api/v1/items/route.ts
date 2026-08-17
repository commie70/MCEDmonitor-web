import { NextResponse } from "next/server";
import {
  pageParams,
  readMonitorReport,
  reportMissingResponse,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-report";
import { API_CACHE_HEADERS } from "@/components/sites/aihot-virxact-com-e007b012/shared/url";

export const dynamic = "force-dynamic";

const CATEGORY_KEYS = ["regulatory", "academic", "research", "market"] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

/**
 * GET /api/v1/items — 监测条目流;支持 ?category= 过滤与 ?offset=/limit= 分页(limit ≤200,默认 100)。
 */
export async function GET(request: Request) {
  const report = await readMonitorReport();
  if (!report) return reportMissingResponse();

  const category = new URL(request.url).searchParams.get("category");
  const filter = CATEGORY_KEYS.includes(category as CategoryKey)
    ? (category as CategoryKey)
    :null;
  const filtered = filter
    ? report.items.filter((item) => item.category === filter)
    : report.items;
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
