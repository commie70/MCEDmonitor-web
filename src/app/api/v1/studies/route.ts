import { NextResponse } from "next/server";
import { STUDIES } from "@/data";
import { apiStudy } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/** GET /api/v1/studies — 全部研究证据；?company= 按企业、?design= 按研究设计过滤。 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const company = params.get("company");
  const design = params.get("design");
  const studies = STUDIES.filter(
    (study) => (!company || study.companyId === company) && (!design || study.design === design)
  ).map((study) => ({ company_id: study.companyId, ...apiStudy(study) }));
  return NextResponse.json({ count: studies.length, studies }, { headers: API_CACHE_HEADERS });
}
