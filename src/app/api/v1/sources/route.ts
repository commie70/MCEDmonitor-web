import { NextResponse } from "next/server";
import { SOURCES } from "@/data";
import { apiSource } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/** GET /api/v1/sources — 信源库；?kind= 按类型过滤。 */
export function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind");
  const sources = SOURCES.filter((source) => !kind || source.kind === kind).map(apiSource);
  return NextResponse.json({ count: sources.length, sources }, { headers: API_CACHE_HEADERS });
}
