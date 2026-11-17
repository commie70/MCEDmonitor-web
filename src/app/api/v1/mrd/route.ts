import { NextResponse } from "next/server";
import { apiMrdInstitutionPrices, apiMrdPriceRanges, apiMrdProducts } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/mrd — MRD 产品矩阵(匿名只读)。
 * ?category=solid|heme、?approach=tumor-informed|tumor-naive、?tissue=WES|WGS|panel、?region=国内|国外 过滤。
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const products = apiMrdProducts({
    category: params.get("category") ?? undefined,
    approach: params.get("approach") ?? undefined,
    tissue: params.get("tissue") ?? undefined,
    tracking: params.get("tracking") ?? undefined,
    q: params.get("q") ?? undefined,
    region: params.get("region") ?? undefined,
  });
  return NextResponse.json(
    { count: products.length, products, price_ranges: apiMrdPriceRanges(), institution_prices: apiMrdInstitutionPrices() },
    { headers: API_CACHE_HEADERS }
  );
}
