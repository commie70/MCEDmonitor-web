import { NextResponse } from "next/server";
import { apiCompanies } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/** GET /api/v1/companies — 企业摘要列表(匿名只读)。 */
export function GET() {
  const companies = apiCompanies();
  return NextResponse.json(
    { generated_at: new Date().toISOString(), count: companies.length, companies },
    { headers: API_CACHE_HEADERS }
  );
}
