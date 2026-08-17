import { NextResponse } from "next/server";
import { ALL_COMPETITORS } from "@/components/sites/aihot-virxact-com-e007b012/shared/competitors";
import { API_CACHE_HEADERS } from "@/components/sites/aihot-virxact-com-e007b012/shared/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/companies — 竞品公司摘要列表(匿名只读)。
 */
export function GET() {
  const companies = ALL_COMPETITORS.map((c) => ({
    id: c.id,
    co: c.co,
    en: c.en, region: c.region, self: c.self ?? false,
    routes: c.routes,
    layout: c.layout,product: c.product,
    cancerLabel: c.cancerLabel,
    mced: c.mced,
    status: c.status,
    statusKeys: c.statusKeys,
    updatedAt: c.updatedAt,}));

  return NextResponse.json(
    {
      generated_at:new Date().toISOString(),
      count: companies.length,
      companies,
    },
    { headers: API_CACHE_HEADERS }
  );
}
