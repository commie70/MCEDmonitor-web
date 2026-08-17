import { NextResponse } from "next/server";
import { ALL_COMPETITORS } from "@/components/sites/aihot-virxact-com-e007b012/shared/competitors";
import { API_CACHE_HEADERS } from "@/components/sites/aihot-virxact-com-e007b012/shared/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/companies/{id} — 单个竞品完整档案(含 studies/panel/src)。
 */
export async function GET(
  _request: Request,
  ctx:{ params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const company = ALL_COMPETITORS.find((c) => c.id === id);

  if (!company) {
    return NextResponse.json({ error: "not_found" },{ status: 404 });
  }

  return NextResponse.json(company,{ headers: API_CACHE_HEADERS });
}
