import { NextResponse } from "next/server";
import { getStudy } from "@/data";
import { apiStudy } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/** GET /api/v1/studies/{id} — 单项研究证据。 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const study = getStudy(id);
  if (!study) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ company_id: study.companyId, ...apiStudy(study) }, { headers: API_CACHE_HEADERS });
}
