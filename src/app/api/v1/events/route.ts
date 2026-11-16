import { NextResponse } from "next/server";
import { apiEvent } from "@/lib/api";
import { dateKey } from "@/lib/dates";
import { loadEvents } from "@/lib/load-events";
import { pageParams } from "@/lib/monitor-report";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/events — 统一事件时间线(监测流水线 + 证据库里程碑)，按时间倒序。
 * 过滤：?kind= ?company= ?level=L1,L2 ?origin=monitor|archive ?since=YYYY-MM-DD ?q=
 * 分页：?offset= ?limit=(≤200，默认 50)
 */
export async function GET(request: Request) {
  const { events, report } = await loadEvents();
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const company = params.get("company");
  const origin = params.get("origin");
  const levels = (params.get("level") ?? "").split(",").filter(Boolean);
  const since = params.get("since");
  const needle = (params.get("q") ?? "").slice(0, 200).toLowerCase();

  const filtered = events.filter((event) => {
    if (kind && event.kind !== kind) return false;
    if (company && event.companyId !== company) return false;
    if (origin && event.origin !== origin) return false;
    if (levels.length && !(event.level && levels.includes(event.level))) return false;
    if (since && dateKey(event.date) < dateKey(since)) return false;
    if (needle && !`${event.title} ${event.summary} ${event.company} ${event.product}`.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });
  const { offset, limit } = pageParams(request.url, 50, 200);

  return NextResponse.json(
    {
      generated_at: report?.generated_at ?? null,
      count: filtered.length,
      offset,
      limit,
      events: filtered.slice(offset, offset + limit).map(apiEvent),
    },
    { headers: API_CACHE_HEADERS }
  );
}
