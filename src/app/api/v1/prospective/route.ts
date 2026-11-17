import { NextResponse } from "next/server";
import { apiProspective } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/** GET /api/v1/prospective — 前瞻队列、注册研究、前瞻干预与 RCT 性能对照。 */
export function GET() {
  const prospective = apiProspective();
  return NextResponse.json({ count: prospective.length, prospective }, { headers: API_CACHE_HEADERS });
}
