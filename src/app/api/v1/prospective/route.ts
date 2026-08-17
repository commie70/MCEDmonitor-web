import { NextResponse } from "next/server";
import { PROSPECTIVE } from "@/components/sites/aihot-virxact-com-e007b012/shared/competitors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/prospective — 前瞻队列性能对照表(非病例对照研究)。
 */
export function GET() {
  return NextResponse.json({
    count: PROSPECTIVE.length,prospective: PROSPECTIVE,});
}
