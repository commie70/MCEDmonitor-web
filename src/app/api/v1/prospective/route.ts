import { NextResponse } from "next/server";
import { PROSPECTIVE } from "@/components/sites/aihot-virxact-com-e007b012/shared/competitors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/prospective — 前瞻队列、注册研究、前瞻干预与 RCT 性能对照。
 */
export function GET() {
  return NextResponse.json({
    count: PROSPECTIVE.length,prospective: PROSPECTIVE,});
}
