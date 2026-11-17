import { NextResponse } from "next/server";
import { getCompany } from "@/data";
import { apiCompany } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/** GET /api/v1/companies/{id} — 单家完整档案(研究、性能、报证、公开信源)。 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const company = getCompany(id);
  if (!company) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(apiCompany(company), { headers: API_CACHE_HEADERS });
}
